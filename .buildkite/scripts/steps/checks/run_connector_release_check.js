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
 * No manifest is stored. The connector list comes straight from the source tree:
 *   - head:    load all specs, then read `require.cache` to map each connector's
 *              id + supportedFeatureIds to its spec file path. (The connector id,
 *              `spec.metadata.id`, is not encoded in the path, so we get it by
 *              loading the specs rather than from the file name.)
 *   - changed: spec files this PR touched (`git diff <base-ref> HEAD`)
 *   - release: whether a connector's spec file already exists at the serverless
 *              release ref (`git cat-file -e <released-ref>:<path>`) — an existence
 *              check only.
 *
 * This never fails the build — it only produces a report for the notifier.
 *
 * Usage:
 *   node run_connector_release_check.js \
 *     --report-path <file> [--base-ref <sha>] [--released-ref <sha>]
 */

require('@kbn/setup-node-env');

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { classifyConnectorRelease } = require('./connector_release_check');

const SPECS_DIR = 'src/platform/packages/shared/kbn-connector-specs/src/specs';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const SPECS_ABS = path.join(REPO_ROOT, SPECS_DIR);

const parseFlag = (name) => {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
};

const git = (args) =>
  execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

/**
 * Every connector at the PR head, mapped to its spec file. Loading `all_specs`
 * populates `require.cache` with one entry per spec module, so we can read each
 * connector's id + features together with the absolute path they came from.
 */
const readHeadConnectors = () => {
  require('@kbn/connector-specs/src/all_specs');

  const connectors = [];
  for (const [absPath, mod] of Object.entries(require.cache)) {
    if (!absPath.startsWith(SPECS_ABS + path.sep)) continue;
    for (const exported of Object.values(mod.exports || {})) {
      if (exported && exported.metadata && exported.metadata.id) {
        connectors.push({
          id: exported.metadata.id,
          supportedFeatureIds: [].concat(exported.metadata.supportedFeatureIds ?? []),
          relPath: path.relative(REPO_ROOT, absPath),
        });
      }
    }
  }
  return connectors;
};

// Spec files this PR changed, relative to the repo root. Null when no base ref is
// available to diff against.
const changedSpecFiles = (baseRef) => {
  if (!baseRef) return null;
  try {
    return new Set(
      git(['diff', '--name-only', baseRef, 'HEAD', '--', SPECS_DIR])
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
    );
  } catch (err) {
    console.warn(`Could not diff spec files against ${baseRef}: ${err.message}`);
    return null;
  }
};

// True when the file exists at the given ref. A brand-new connector's file is absent.
const existsAtRef = (ref, relPath) => {
  try {
    git(['cat-file', '-e', `${ref}:${relPath}`]);
    return true;
  } catch (err) {
    return false;
  }
};

const main = () => {
  const reportPath = parseFlag('report-path');
  if (!reportPath) {
    console.error(
      'Usage: run_connector_release_check --report-path <file> [--base-ref <sha>] [--released-ref <sha>]'
    );
    process.exit(2);
  }

  const baseRef = parseFlag('base-ref');
  const releasedRef = parseFlag('released-ref');
  const releasedAvailable = Boolean(releasedRef);

  const changedFiles = changedSpecFiles(baseRef);
  if (changedFiles === null) {
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          findings: [],
          note: 'Could not determine which connector specs this PR changed; skipping the release check.',
          baseRef: baseRef ?? null,
          releasedRef: releasedRef ?? null,
          releasedManifestAvailable: releasedAvailable,
        },
        null,
        2
      )
    );
    console.log('Connector release check: no comparable base ref; skipping.');
    return;
  }

  const changedConnectors = readHeadConnectors()
    .filter((connector) => changedFiles.has(connector.relPath))
    .map((connector) => ({
      id: connector.id,
      supportedFeatureIds: connector.supportedFeatureIds,
      existsInRelease: releasedAvailable && existsAtRef(releasedRef, connector.relPath),
    }));

  const { findings, note } = classifyConnectorRelease(changedConnectors, releasedAvailable);

  const report = {
    findings,
    note,
    baseRef: baseRef ?? null,
    releasedRef: releasedRef ?? null,
    releasedManifestAvailable: releasedAvailable,
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(
    `Connector release check: ${findings.length} advisory finding(s)` + (note ? ` (${note})` : '')
  );
};

main();
