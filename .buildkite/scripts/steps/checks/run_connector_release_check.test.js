/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const {
  ALL_SPECS_PATH,
  barrelExports,
  featureListFrom,
  isRegisteredIn,
  parsePncEntries,
  resolvePncRefs,
  runCheck,
  scopeApplicableConnectors,
} = require('./run_connector_release_check');

const SHA_A = 'a'.repeat(40);
const SHA_B = 'b'.repeat(40);
const SPEC_PATH = 'src/platform/packages/shared/kbn-connector-specs/src/specs/acme/acme.ts';
const SPEC_MODULE = './specs/acme/acme';

const versionsYaml = (body) => `qa-ds-1: "${'9'.repeat(40)}"\n${body}\n`;
const barrelWith = (...modules) =>
  modules.map((module) => `export * from '${module}';`).join('\n') + '\n';
const specSource = (featureIds) =>
  `export const Acme = { metadata: { id: '.acme', supportedFeatureIds: ${featureIds} } };`;

/**
 * Fake git that answers by matching the joined argument list, records every call, and throws
 * for anything unhandled — the same failure shape `execFileSync` produces.
 */
const fakeGit = (handlers) => {
  const calls = [];
  const exec = (args) => {
    calls.push(args.join(' '));
    for (const [pattern, result] of Object.entries(handlers)) {
      if (args.join(' ').includes(pattern)) {
        if (result === null) throw new Error(`git failed: ${pattern}`);
        return result;
      }
    }
    throw new Error(`unhandled git call: ${args.join(' ')}`);
  };

  return {
    calls,
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
};

const fakeOctokit = ({ yaml, getCommit } = {}) => ({
  request: jest.fn(async () => {
    if (yaml === undefined) throw new Error('404 Not Found');
    return { data: yaml };
  }),
  repos: { getCommit: getCommit ?? jest.fn(async () => ({ data: { sha: SHA_A } })) },
});

describe('parsePncEntries', () => {
  it('collects every production-noncanary slice and ignores other environments', () => {
    const { entries, malformed } = parsePncEntries(
      versionsYaml(
        `production-canary-ds-1: "${SHA_B}"\n` +
          `production-noncanary-ds-1: "${SHA_A}"\n` +
          `production-noncanary-ds-5: "${SHA_B}"`
      )
    );

    expect(entries).toEqual([
      { slice: 'production-noncanary-ds-1', sha: SHA_A },
      { slice: 'production-noncanary-ds-5', sha: SHA_B },
    ]);
    expect(malformed).toEqual([]);
  });

  it('accepts abbreviated SHAs', () => {
    const { entries } = parsePncEntries(versionsYaml('production-noncanary-ds-1: "abc1234"'));

    expect(entries).toEqual([{ slice: 'production-noncanary-ds-1', sha: 'abc1234' }]);
  });

  it('reports a slice with an unreadable value as malformed rather than dropping it', () => {
    const { entries, malformed } = parsePncEntries(
      versionsYaml(
        `production-noncanary-ds-1: "${SHA_A}"\n` +
          `production-noncanary-ds-2: "not-a-sha"\n` +
          `production-noncanary-ds-3: ""\n` +
          `production-noncanary-ds-4:\n` +
          `production-noncanary-ds-5: ${SHA_B}`
      )
    );

    expect(entries).toEqual([{ slice: 'production-noncanary-ds-1', sha: SHA_A }]);
    expect(malformed.map(({ slice }) => slice)).toEqual([
      'production-noncanary-ds-2',
      'production-noncanary-ds-3',
      'production-noncanary-ds-4',
      'production-noncanary-ds-5',
    ]);
  });

  it('returns nothing when the file has no PNC slices at all', () => {
    expect(parsePncEntries(versionsYaml('staging-ds-1: "abc1234"'))).toEqual({
      entries: [],
      malformed: [],
    });
  });
});

describe('barrel registration', () => {
  it('extracts the exported spec modules', () => {
    expect([...barrelExports(barrelWith('./specs/acme/acme', './specs/other/other'))]).toEqual([
      './specs/acme/acme',
      './specs/other/other',
    ]);
  });

  it('treats an unexported module as unregistered even though its file exists', () => {
    expect(isRegisteredIn(barrelWith('./specs/other/other'), SPEC_MODULE)).toBe(false);
    expect(isRegisteredIn(barrelWith(SPEC_MODULE), SPEC_MODULE)).toBe(true);
  });
});

describe('featureListFrom', () => {
  it('normalizes a single-line declaration', () => {
    expect(featureListFrom(specSource(`['workflows', 'agentBuilder']`))).toBe(
      `'workflows', 'agentBuilder'`
    );
  });

  it('normalizes a multiline declaration to the same value as its single-line form', () => {
    const multiline = specSource(`[\n      'workflows',\n      'agentBuilder',\n    ]`);

    expect(featureListFrom(multiline)).toBe(`'workflows', 'agentBuilder',`);
  });

  it('returns null when the declaration cannot be extracted', () => {
    expect(featureListFrom('export const Acme = { metadata: { id: ".acme" } };')).toBeNull();
  });
});

describe('resolvePncRefs', () => {
  const log = () => {};

  it('resolves every distinct slice SHA and reads the barrel at each ref', async () => {
    const git = fakeGit({
      [`rev-parse --verify ${SHA_A}`]: `${SHA_A}\n`,
      [`rev-parse --verify ${SHA_B}`]: `${SHA_B}\n`,
      show: barrelWith(SPEC_MODULE),
    });
    const result = await resolvePncRefs({
      git,
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml(
          `production-noncanary-ds-1: "${SHA_A}"\nproduction-noncanary-ds-5: "${SHA_B}"`
        ),
      }),
    });

    expect(result.inconclusiveReason).toBeUndefined();
    expect(result.refs).toEqual([SHA_A, SHA_B]);
    expect(result.barrels.get(SHA_B)).toContain(SPEC_MODULE);
  });

  it('deduplicates slices that pin the same SHA', async () => {
    const git = fakeGit({ 'rev-parse': `${SHA_A}\n`, show: barrelWith(SPEC_MODULE) });
    const result = await resolvePncRefs({
      git,
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml(
          `production-noncanary-ds-1: "${SHA_A}"\nproduction-noncanary-ds-5: "${SHA_A}"`
        ),
      }),
    });

    expect(result.refs).toEqual([SHA_A]);
  });

  it('expands an abbreviated SHA locally without calling the commits API', async () => {
    const getCommit = jest.fn();
    const git = fakeGit({ 'rev-parse': `${SHA_A}\n`, show: barrelWith(SPEC_MODULE) });
    const result = await resolvePncRefs({
      git,
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml('production-noncanary-ds-1: "abc1234"'),
        getCommit,
      }),
    });

    expect(result.refs).toEqual([SHA_A]);
    expect(getCommit).not.toHaveBeenCalled();
  });

  it('falls back to the commits API when the object is not local, then fetches the ref', async () => {
    const getCommit = jest.fn(async () => ({ data: { sha: SHA_A } }));
    const git = fakeGit({
      'rev-parse': null,
      fetch: '',
      show: barrelWith(SPEC_MODULE),
    });
    const result = await resolvePncRefs({
      git,
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml('production-noncanary-ds-1: "abc1234"'),
        getCommit,
      }),
    });

    expect(getCommit).toHaveBeenCalledWith({ owner: 'elastic', repo: 'kibana', ref: 'abc1234' });
    expect(git.calls).toContain(`fetch --quiet --depth=1 origin ${SHA_A}`);
    expect(result.refs).toEqual([SHA_A]);
  });

  it.each([
    [
      'no token',
      { hasToken: false, octokit: fakeOctokit({ yaml: '' }) },
      /GITHUB_TOKEN is not set/,
    ],
    ['unreadable GitOps file', { hasToken: true, octokit: fakeOctokit() }, /Could not read/],
    [
      'zero slices',
      { hasToken: true, octokit: fakeOctokit({ yaml: versionsYaml('staging-ds-1: "abc1234"') }) },
      /No production-noncanary-ds-\* entries/,
    ],
  ])('is inconclusive on %s', async (_name, overrides, expected) => {
    const result = await resolvePncRefs({
      git: fakeGit({}),
      log,
      ...overrides,
    });

    expect(result.refs).toEqual([]);
    expect(result.inconclusiveReason).toMatch(expected);
  });

  it('is inconclusive when one slice is malformed even though the others are valid', async () => {
    const git = fakeGit({ 'rev-parse': `${SHA_A}\n`, show: barrelWith(SPEC_MODULE) });
    const result = await resolvePncRefs({
      git,
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml(
          `production-noncanary-ds-1: "${SHA_A}"\n` +
            `production-noncanary-ds-2: "${SHA_B}"\n` +
            `production-noncanary-ds-3: "corrupted"`
        ),
      }),
    });

    expect(result.refs).toEqual([]);
    expect(result.inconclusiveReason).toContain('production-noncanary-ds-3');
    expect(result.inconclusiveReason).toContain('subset of Production-NonCanary');
    // Never inspects anything: a partial comparison must not happen at all.
    expect(git.calls).toEqual([]);
  });

  it('is inconclusive when a commit cannot be resolved', async () => {
    const result = await resolvePncRefs({
      git: fakeGit({ 'rev-parse': null }),
      hasToken: true,
      log,
      octokit: fakeOctokit({
        yaml: versionsYaml('production-noncanary-ds-1: "abc1234"'),
        getCommit: jest.fn(async () => {
          throw new Error('422 No commit found');
        }),
      }),
    });

    expect(result.inconclusiveReason).toMatch(/Could not resolve abc1234/);
  });

  it('is inconclusive when a ref cannot be fetched', async () => {
    const result = await resolvePncRefs({
      git: fakeGit({ 'rev-parse': null, fetch: null }),
      hasToken: true,
      log,
      octokit: fakeOctokit({ yaml: versionsYaml(`production-noncanary-ds-1: "${SHA_A}"`) }),
    });

    expect(result.inconclusiveReason).toMatch(/Could not fetch/);
  });

  it('is inconclusive when the barrel cannot be read at a ref', async () => {
    const result = await resolvePncRefs({
      git: fakeGit({ 'rev-parse': `${SHA_A}\n`, show: null }),
      hasToken: true,
      log,
      octokit: fakeOctokit({ yaml: versionsYaml(`production-noncanary-ds-1: "${SHA_A}"`) }),
    });

    expect(result.inconclusiveReason).toContain(ALL_SPECS_PATH);
  });
});

describe('scopeApplicableConnectors', () => {
  const connector = {
    id: '.acme',
    supportedFeatureIds: ['workflows'],
    relPath: SPEC_PATH,
    moduleSpecifier: SPEC_MODULE,
  };
  const scope = (handlers, headSource = specSource(`['workflows']`)) =>
    scopeApplicableConnectors({
      git: fakeGit(handlers),
      readFile: () => headSource,
      baseRef: 'base',
      connectors: [connector],
    });

  it('includes a newly added connector module', () => {
    const result = scope({
      '--diff-filter=A': `${SPEC_PATH}\n`,
      '--name-only': `${SPEC_PATH}\n`,
      [`base:${ALL_SPECS_PATH}`]: barrelWith(),
    });

    expect(result.known).toBe(true);
    expect(result.connectors).toHaveLength(1);
  });

  it('includes a module newly exported from the barrel even when its file is unchanged', () => {
    const result = scope({
      '--diff-filter=A': '\n',
      '--name-only': '\n',
      [`base:${ALL_SPECS_PATH}`]: barrelWith('./specs/other/other'),
    });

    expect(result.connectors).toHaveLength(1);
  });

  it('includes a connector whose feature list changed', () => {
    const result = scope({
      '--diff-filter=A': '\n',
      '--name-only': `${SPEC_PATH}\n`,
      [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
      [`base:${SPEC_PATH}`]: specSource(`['agentBuilder']`),
    });

    expect(result.connectors).toHaveLength(1);
  });

  it('excludes a reformatted feature list that declares the same features', () => {
    const result = scope(
      {
        '--diff-filter=A': '\n',
        '--name-only': `${SPEC_PATH}\n`,
        [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
        [`base:${SPEC_PATH}`]: specSource(`[\n  'workflows',\n]`),
      },
      specSource(`['workflows',]`)
    );

    expect(result.connectors).toEqual([]);
  });

  it('excludes an unrelated edit, so an earlier PR advisory is not inherited', () => {
    const result = scope({
      '--diff-filter=A': '\n',
      '--name-only': `${SPEC_PATH}\n`,
      [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
      [`base:${SPEC_PATH}`]: specSource(`['workflows']`),
    });

    expect(result.connectors).toEqual([]);
  });

  it('excludes a connector this PR never touched', () => {
    const result = scope({
      '--diff-filter=A': '\n',
      '--name-only': '\n',
      [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
    });

    expect(result.connectors).toEqual([]);
  });

  it('includes a connector whose declaration cannot be extracted on either side', () => {
    const result = scope(
      {
        '--diff-filter=A': '\n',
        '--name-only': `${SPEC_PATH}\n`,
        [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
        [`base:${SPEC_PATH}`]: 'export const Acme = { metadata: { id: ".acme" } };',
      },
      specSource(`['workflows']`)
    );

    expect(result.connectors).toHaveLength(1);
  });

  it.each([
    ['no base ref', undefined, {}],
    ['an undiffable base ref', 'base', { '--name-only': null }],
    ['an unreadable base barrel', 'base', { '--name-only': '\n', show: null }],
  ])('reports applicability unknown for %s', (_name, baseRef, handlers) => {
    const result = scopeApplicableConnectors({
      git: fakeGit(handlers),
      readFile: () => specSource(`['workflows']`),
      baseRef,
      connectors: [connector],
    });

    expect(result).toEqual({ known: false, connectors: [] });
  });

  it('always diffs against the merge base, never the latest commit', () => {
    const git = fakeGit({
      '--diff-filter=A': '\n',
      '--name-only': '\n',
      [`base:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
    });
    scopeApplicableConnectors({
      git,
      readFile: () => specSource(`['workflows']`),
      baseRef: 'merge-base-sha',
      connectors: [connector],
    });

    for (const call of git.calls.filter((c) => c.startsWith('diff'))) {
      expect(call).toContain('merge-base-sha HEAD');
      expect(call).not.toContain('HEAD~');
    }
  });
});

describe('runCheck', () => {
  const connector = {
    id: '.acme',
    supportedFeatureIds: ['workflows'],
    relPath: SPEC_PATH,
    moduleSpecifier: SPEC_MODULE,
  };

  const run = ({ handlers, yaml, connectors = [connector], baseRef = 'base' }) => {
    const messages = [];
    const git = fakeGit(handlers);
    return runCheck({
      git,
      octokit: fakeOctokit({ yaml }),
      hasToken: true,
      readFile: () => specSource(`['workflows']`),
      baseRef,
      connectors,
      log: (message) => messages.push(message),
    }).then((report) => ({ report, messages, git }));
  };

  const releasedHandlers = {
    'rev-parse': `${SHA_A}\n`,
    [`${SHA_A}:${ALL_SPECS_PATH}`]: barrelWith(SPEC_MODULE),
    '--diff-filter=A': `${SPEC_PATH}\n`,
    '--name-only': `${SPEC_PATH}\n`,
    [`base:${ALL_SPECS_PATH}`]: barrelWith(),
  };
  const yaml = versionsYaml(`production-noncanary-ds-1: "${SHA_A}"`);

  it('resolves and logs the PNC versions before scoping applicability', async () => {
    const { messages } = await run({ handlers: releasedHandlers, yaml });

    expect(messages.indexOf('--- Resolving Production-NonCanary Kibana versions')).toBe(0);
    expect(messages).toContain(`  production-noncanary-ds-1: ${SHA_A}`);
    expect(messages.indexOf('--- Resolving Production-NonCanary Kibana versions')).toBeLessThan(
      messages.indexOf('--- Scoping applicable connectors')
    );
  });

  it('resolves and logs the PNC versions even when this PR changes no connector', async () => {
    const { report, messages } = await run({
      handlers: { ...releasedHandlers, '--diff-filter=A': '\n', '--name-only': '\n' },
      yaml,
      connectors: [],
    });

    expect(messages).toContain(`  distinct refs: ${SHA_A}`);
    expect(messages).toContain('  no connector exposure changed by this PR');
    expect(report.applicableConnectors).toEqual([]);
    expect(report.status).toBe('safe');
  });

  it('reports unsafe for a newly added connector that is not registered in the release', async () => {
    const { report } = await run({
      handlers: { ...releasedHandlers, [`${SHA_A}:${ALL_SPECS_PATH}`]: barrelWith() },
      yaml,
    });

    expect(report.status).toBe('unsafe');
    expect(report.findings).toHaveLength(1);
    expect(report.findings[0].missingFromRefs).toEqual([SHA_A]);
    expect(report.applicabilityKnown).toBe(true);
    expect(report.refs).toEqual([SHA_A]);
  });

  it('reports safe once the connector is registered in every PNC ref', async () => {
    const { report } = await run({ handlers: releasedHandlers, yaml });

    expect(report.status).toBe('safe');
    expect(report.findings).toEqual([]);
  });

  it('reports inconclusive without findings when the release cannot be resolved', async () => {
    const { report } = await run({
      handlers: releasedHandlers,
      yaml: versionsYaml(`production-noncanary-ds-1: "${SHA_A}"\nproduction-noncanary-ds-2: "??"`),
    });

    expect(report.status).toBe('inconclusive');
    expect(report.findings).toEqual([]);
    expect(report.reason).toContain('production-noncanary-ds-2');
    // Applicability is still known, so the notifier can decide whether to comment at all.
    expect(report.applicabilityKnown).toBe(true);
    expect(report.applicableConnectors).toHaveLength(1);
  });

  it('reports inconclusive and applicabilityKnown false when the merge base is unusable', async () => {
    // No `--base-ref` reached the runner, so there is nothing to diff HEAD against.
    const { report } = await run({ handlers: releasedHandlers, yaml, baseRef: null });

    expect(report.status).toBe('inconclusive');
    expect(report.applicabilityKnown).toBe(false);
    expect(report.applicableConnectors).toEqual([]);
    expect(report.baseRef).toBeNull();
  });
});
