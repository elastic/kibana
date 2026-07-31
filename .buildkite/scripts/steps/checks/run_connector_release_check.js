#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Runs the connector 2-step release check and writes an advisory report.
 *
 * No manifest is stored. Everything comes from the source tree and from git:
 *   1. resolve   every `production-noncanary-ds-*` (PNC) Kibana SHA pinned in
 *                `serverless-gitops/services/kibana/versions.yaml`, expand abbreviated
 *                SHAs, and fetch each distinct ref. Always runs, and always logs, so a
 *                CI run proves this path works even when the PR changes no connector.
 *   2. applicable which connectors this PR changes the *exposure* of, computed against
 *                `<merge-base>..HEAD` (never the latest commit) so that a fully reverted
 *                connector change becomes non-applicable and clears its advisory, while a
 *                later unrelated commit cannot hide an earlier unsafe change.
 *   3. registered whether each applicable connector is exported from `all_specs.ts` at
 *                every PNC ref. Registration iterates that barrel, so a spec file that
 *                exists at a ref without being exported there was never registered.
 *   4. classify  hand the plain data to the pure classifier.
 *
 * Every side effect (git, GitHub, the filesystem, logging) is injected, so the whole flow
 * is unit-testable. `main()` is the only place that builds real dependencies.
 *
 * This never fails the build — it only produces a report for the notifier.
 *
 * Usage:
 *   node run_connector_release_check.js --report-path <file> [--base-ref <sha>]
 */

const { classifyConnectorRelease } = require('./connector_release_check');

const PACKAGE_SRC_DIR = 'src/platform/packages/shared/kbn-connector-specs/src';
const SPECS_DIR = `${PACKAGE_SRC_DIR}/specs`;
const ALL_SPECS_PATH = `${PACKAGE_SRC_DIR}/all_specs.ts`;

const GITOPS_VERSIONS_FILE = {
  owner: 'elastic',
  repo: 'serverless-gitops',
  path: 'services/kibana/versions.yaml',
};

// Every PNC slice pins its own Kibana SHA. They are equal in steady state and differ while a
// rollout or a rollback is in flight, so all of them have to be inspected. Keys are matched
// separately from values: a slice whose value we cannot read must make the whole run
// inconclusive, not silently disappear from the set we compare against.
const PNC_KEY_RE = /^[ \t]*(production-noncanary-ds-\d+)[ \t]*:(.*)$/gm;
const PNC_VALUE_RE = /^"([0-9a-f]{7,40})"$/;

// `export * from './specs/<dir>/<file>';` — the list registration actually iterates.
const BARREL_EXPORT_RE = /export \* from '(\.\/specs\/[^']+)'/g;

// The bracketed feature list, spanning newlines. Used only to decide whether this PR changed
// the declaration; the safety decision never depends on it.
const FEATURE_LIST_RE = /supportedFeatureIds\s*:\s*\[([^\]]*)\]/;

/**
 * Splits the GitOps versions file into valid PNC entries and malformed ones. A key with an
 * unreadable value lands in `malformed` so the caller can refuse to report a verdict.
 */
const parsePncEntries = (yaml) => {
  const entries = [];
  const malformed = [];

  for (const match of yaml.matchAll(PNC_KEY_RE)) {
    const [, slice, rawValue] = match;
    const value = rawValue.trim();
    const valueMatch = value.match(PNC_VALUE_RE);

    if (valueMatch) {
      entries.push({ slice, sha: valueMatch[1] });
    } else {
      malformed.push({ slice, value });
    }
  }

  return { entries, malformed };
};

const barrelExports = (source) =>
  new Set([...source.matchAll(BARREL_EXPORT_RE)].map((match) => match[1]));

const isRegisteredIn = (barrel, moduleSpecifier) => barrelExports(barrel).has(moduleSpecifier);

/** The declared feature list as normalized source text, or null when it cannot be extracted. */
const featureListFrom = (source) => {
  const match = source.match(FEATURE_LIST_RE);
  return match ? match[1].replace(/\s+/g, ' ').trim() : null;
};

const fetchVersionsYaml = async (octokit) => {
  const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    ...GITOPS_VERSIONS_FILE,
    mediaType: { format: 'raw' },
  });

  return typeof response.data === 'string'
    ? response.data
    : Buffer.from(response.data.content, 'base64').toString('utf8');
};

// versions.yaml may pin abbreviated SHAs, which git cannot fetch. The PR CI clone usually
// already has the object, so expand locally first and only ask the commits API when it does not.
const expandSha = async ({ git, octokit }, sha) => {
  const local = git.read(['rev-parse', '--verify', `${sha}^{commit}`]);
  if (local) {
    return local.trim();
  }

  const commit = await octokit.repos.getCommit({ owner: 'elastic', repo: 'kibana', ref: sha });
  return commit.data.sha;
};

/**
 * Resolve every distinct PNC Kibana ref and read the registration barrel at each one.
 *
 * Any failure — no token, unreadable GitOps file, zero slices, a malformed value on *any*
 * slice, an unresolvable commit, an unfetchable ref, an unreadable barrel — yields an
 * inconclusive reason instead of a partial result, so the check can never report `safe`
 * against a subset of production.
 *
 * @returns {Promise<{refs: string[], barrels?: Map<string, string>, inconclusiveReason?: string}>}
 */
const resolvePncRefs = async ({ git, octokit, hasToken, log }) => {
  if (!hasToken) {
    return {
      refs: [],
      inconclusiveReason: 'GITHUB_TOKEN is not set, so the GitOps versions file is unreadable.',
    };
  }

  let yaml;
  try {
    yaml = await fetchVersionsYaml(octokit);
  } catch (err) {
    return {
      refs: [],
      inconclusiveReason: `Could not read ${GITOPS_VERSIONS_FILE.repo}/${GITOPS_VERSIONS_FILE.path}: ${err.message}`,
    };
  }

  const { entries, malformed } = parsePncEntries(yaml);
  for (const { slice, sha } of entries) {
    log(`  ${slice}: ${sha}`);
  }
  for (const { slice, value } of malformed) {
    log(`  ${slice}: ${value} (unreadable)`);
  }

  if (malformed.length > 0) {
    return {
      refs: [],
      inconclusiveReason:
        `Malformed Kibana SHA for ${malformed.map(({ slice }) => slice).join(', ')} in ` +
        `${GITOPS_VERSIONS_FILE.path}; refusing to compare against a subset of Production-NonCanary.`,
    };
  }
  if (entries.length === 0) {
    return {
      refs: [],
      inconclusiveReason: `No production-noncanary-ds-* entries found in ${GITOPS_VERSIONS_FILE.path}.`,
    };
  }

  const refs = [];
  for (const sha of [...new Set(entries.map((entry) => entry.sha))]) {
    let ref;
    try {
      ref = await expandSha({ git, octokit }, sha);
    } catch (err) {
      return {
        refs: [],
        inconclusiveReason: `Could not resolve ${sha} as an elastic/kibana commit: ${err.message}`,
      };
    }

    if (
      !git.ok(['rev-parse', '--verify', `${ref}^{commit}`]) &&
      !git.ok(['fetch', '--quiet', '--depth=1', 'origin', ref])
    ) {
      return { refs: [], inconclusiveReason: `Could not fetch ${ref} from origin.` };
    }

    if (!refs.includes(ref)) {
      refs.push(ref);
    }
  }

  const barrels = new Map();
  for (const ref of refs) {
    const barrel = git.read(['show', `${ref}:${ALL_SPECS_PATH}`]);
    if (barrel === null) {
      return { refs: [], inconclusiveReason: `Could not read ${ALL_SPECS_PATH} at ${ref}.` };
    }
    barrels.set(ref, barrel);
  }

  return { refs, barrels };
};

const diffNames = ({ git, baseRef }, filterArgs) =>
  git.read(['diff', '--name-only', ...filterArgs, baseRef, 'HEAD', '--', SPECS_DIR]);

const toPathSet = (output) =>
  new Set(
    output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  );

/**
 * Connectors whose exposure this PR changes: newly added modules, modules newly exported from
 * the barrel, and modules whose `supportedFeatureIds` value changed. Always computed against
 * the merge base, so an unrelated edit to a connector left unpublished by an earlier PR does
 * not inherit that PR's advisory, and a fully reverted change becomes non-applicable.
 *
 * @returns {{known: boolean, connectors: Array<object>}}
 */
const scopeApplicableConnectors = ({ git, readFile, baseRef, connectors }) => {
  if (!baseRef) {
    return { known: false, connectors: [] };
  }

  const changedOutput = diffNames({ git, baseRef }, []);
  const addedOutput = diffNames({ git, baseRef }, ['--diff-filter=A']);
  const baseBarrel = git.read(['show', `${baseRef}:${ALL_SPECS_PATH}`]);
  if (changedOutput === null || addedOutput === null || baseBarrel === null) {
    return { known: false, connectors: [] };
  }

  const changed = toPathSet(changedOutput);
  const added = toPathSet(addedOutput);
  const baseExports = barrelExports(baseBarrel);

  return {
    known: true,
    connectors: connectors.filter(({ relPath, moduleSpecifier }) => {
      if (added.has(relPath)) return true; // new connector module
      if (!baseExports.has(moduleSpecifier)) return true; // newly registered in the barrel
      if (!changed.has(relPath)) return false; // untouched by this PR

      const baseSource = git.read(['show', `${baseRef}:${relPath}`]);
      if (baseSource === null) return true;

      // Conservative: include the connector when either declaration cannot be extracted,
      // rather than silently skipping a change we failed to read.
      const baseList = featureListFrom(baseSource);
      const headList = featureListFrom(readFile(relPath));
      if (baseList === null || headList === null) return true;
      return baseList !== headList;
    }),
  };
};

/**
 * Resolve, then scope, then classify — in that order. Resolution runs and logs unconditionally,
 * even when this PR changes no connector, so one CI log proves the multi-SHA path works.
 */
const runCheck = async ({ git, octokit, hasToken, readFile, baseRef, connectors, log }) => {
  log('--- Resolving Production-NonCanary Kibana versions');
  const release = await resolvePncRefs({ git, octokit, hasToken, log });
  log(
    release.inconclusiveReason
      ? `  unresolved: ${release.inconclusiveReason}`
      : `  distinct refs: ${release.refs.join(', ')}`
  );

  log('--- Scoping applicable connectors');
  const { known, connectors: applicable } = scopeApplicableConnectors({
    git,
    readFile,
    baseRef,
    connectors,
  });
  if (!known) {
    log(`  could not diff against base ref ${baseRef ?? '(none)'}; applicability unknown`);
  } else {
    log(
      applicable.length === 0
        ? '  no connector exposure changed by this PR'
        : `  applicable: ${applicable.map(({ id }) => id).join(', ')}`
    );
  }

  const withAvailability = applicable.map((connector) => ({
    id: connector.id,
    supportedFeatureIds: connector.supportedFeatureIds,
    missingFromRefs: release.refs.filter(
      (ref) => !isRegisteredIn(release.barrels.get(ref), connector.moduleSpecifier)
    ),
  }));

  const { status, findings, reason, refs } = classifyConnectorRelease(withAvailability, release);

  return {
    status: known ? status : 'inconclusive',
    reason: known ? reason : 'Could not determine which connectors this PR changes.',
    applicabilityKnown: known,
    refs,
    baseRef: baseRef ?? null,
    applicableConnectors: withAvailability,
    findings,
  };
};

/* istanbul ignore next -- dependency wiring, exercised by the CI step itself */
const main = async () => {
  require('@kbn/setup-node-env');

  const fs = require('fs');
  const path = require('path');
  const { execFileSync } = require('child_process');

  const REPO_ROOT = path.resolve(__dirname, '../../../..');
  const SPECS_ABS = path.join(REPO_ROOT, SPECS_DIR);

  const parseFlag = (name) => {
    const idx = process.argv.indexOf(`--${name}`);
    return idx !== -1 ? process.argv[idx + 1] : undefined;
  };

  const reportPath = parseFlag('report-path');
  if (!reportPath) {
    console.error('Usage: run_connector_release_check --report-path <file> [--base-ref <sha>]');
    process.exit(2);
  }

  const exec = (args) =>
    execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  const git = {
    // Content, or null when the command fails. Never used for commands whose stdout is empty
    // on success — there, `ok` distinguishes success from failure.
    read: (args) => {
      try {
        return exec(args);
      } catch (err) {
        return null;
      }
    },
    ok: (args) => {
      try {
        exec(args);
        return true;
      } catch (err) {
        return false;
      }
    },
  };

  /**
   * Every connector at the PR head, mapped to its spec file. Loading `all_specs` populates
   * `require.cache` with one entry per spec module, so we can read each connector's id and
   * features together with the path they came from (the id is not encoded in the path).
   */
  const readHeadConnectors = () => {
    require('@kbn/connector-specs/src/all_specs');

    const connectors = [];
    for (const [absPath, mod] of Object.entries(require.cache)) {
      if (!absPath.startsWith(SPECS_ABS + path.sep)) continue;
      for (const exported of Object.values(mod.exports || {})) {
        if (exported && exported.metadata && exported.metadata.id) {
          const relPath = path.relative(REPO_ROOT, absPath);
          connectors.push({
            id: exported.metadata.id,
            supportedFeatureIds: [].concat(exported.metadata.supportedFeatureIds ?? []),
            relPath,
            moduleSpecifier: `./${path.relative(PACKAGE_SRC_DIR, relPath).replace(/\.ts$/, '')}`,
          });
        }
      }
    }
    return connectors;
  };

  const hasToken = Boolean(process.env.GITHUB_TOKEN);
  const report = await runCheck({
    git,
    octokit: hasToken
      ? new (require('@octokit/rest').Octokit)({ auth: process.env.GITHUB_TOKEN })
      : null,
    hasToken,
    readFile: (relPath) => fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'),
    baseRef: parseFlag('base-ref') || undefined,
    connectors: readHeadConnectors(),
    log: (message) => console.log(message),
  });

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    `--- Connector release check: ${report.status}` +
      (report.reason ? ` (${report.reason})` : '') +
      ` — ${report.findings.length} advisory finding(s)`
  );
};

module.exports = {
  ALL_SPECS_PATH,
  SPECS_DIR,
  barrelExports,
  featureListFrom,
  isRegisteredIn,
  parsePncEntries,
  resolvePncRefs,
  runCheck,
  scopeApplicableConnectors,
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Connector release check failed to produce a report:', error);
    process.exit(1);
  });
}
