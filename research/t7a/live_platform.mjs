/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Live worker-Core platform probe. Prints counts, ids, and generations.
 * Never prints config values. */

const KBN = process.env.T7A_KBN ?? 'http://127.0.0.1:5681';
const AUTH = 'Basic ' + Buffer.from(process.env.T7A_AUTH ?? 'elastic:changeme').toString('base64');

const call = async (method, path, body, version) => {
  const res = await fetch(KBN + path, {
    method,
    headers: {
      authorization: AUTH,
      'kbn-xsrf': 't7a',
      'x-elastic-internal-origin': 'Kibana',
      'content-type': 'application/json',
      ...(version ? { 'elastic-api-version': version } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    /* keep text */
  }
  return { status: res.status, body: parsed };
};

const must = (result, what) => {
  if (result.status >= 300) {
    const message = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);
    throw new Error(`${what}: ${result.status} ${message.slice(0, 500)}`);
  }
  return result.body;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const probe = async () =>
  must(
    await call('POST', '/internal/workload_isolation_research/t7a/probe', { kind: 'platform' }),
    'platform probe'
  );

const summarise = (body) => ({
  status: body.status,
  configKeyCount: body.configKeyCount,
  configPlugins: body.configPlugins,
  configErrors: body.configErrors,
  replicaGenerations: body.replicaGenerations,
  probeFlag: body.probeFlag,
  activeProduct: body.activeProduct ?? null,
  featureCount: body.featureCount,
  forwarded: body.forwarded,
  executionContextId: body.observation?.executionContextId ?? null,
  workerGenerations: body.observation?.generations ?? null,
  workerProbeFlag: body.observation?.probeFlag ?? null,
  workerFeatureCount: body.observation?.featureCount ?? null,
  workerConfigKeyCount: body.observation?.configKeyCount ?? null,
  exclusions: body.observation?.exclusions ?? null,
  logError: body.observation?.logError ?? null,
  auditError: body.observation?.auditError ?? null,
  analyticsError: body.observation?.analyticsError ?? null,
  so: body.observation?.so ?? null,
  error: body.error,
});

const assertNoValues = (body) => {
  const text = JSON.stringify(summarise(body));
  if (text.includes('encryptionKey') || /"[A-Za-z0-9+/]{40,}"/.test(text)) {
    throw new Error('platform summary looks like it contains a config value');
  }
};

const main = async () => {
  const mode = process.argv[2] ?? 'probe';
  if (mode === 'configure') {
    const localSo = process.argv[3] === 'local';
    console.log(
      JSON.stringify(
        must(
          await call('POST', '/internal/workload_isolation_research/t7a/config', {
            mode: 'offmain',
            transport: 'thread',
            slots: 1,
            localSo,
          }),
          'configure'
        )
      )
    );
    return;
  }
  if (mode === 'flag') {
    const value = process.argv[3] !== 'false';
    console.log(
      JSON.stringify(
        must(
          await call(
            'PUT',
            '/internal/core/_settings',
            { 'feature_flags.overrides': { 'workerCore.liveProbe': value } },
            '1'
          ),
          'set flag'
        )
      )
    );
    return;
  }
  const before = await probe();
  assertNoValues(before);
  console.log(JSON.stringify({ phase: 'before', ...summarise(before) }));
  if (mode !== 'refresh') return;
  must(
    await call(
      'PUT',
      '/internal/core/_settings',
      { 'feature_flags.overrides': { 'workerCore.liveProbe': true } },
      '1'
    ),
    'set flag'
  );
  let after = before;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    after = await probe();
    assertNoValues(after);
    if (after.probeFlag === true && after.observation?.probeFlag === true) break;
  }
  console.log(JSON.stringify({ phase: 'after', ...summarise(after) }));
  if (after.probeFlag !== true || after.observation?.probeFlag !== true) {
    throw new Error('worker did not observe workerCore.liveProbe=true');
  }
  const beforeGen = before.replicaGenerations?.featureFlags ?? 0;
  const afterGen = after.replicaGenerations?.featureFlags ?? 0;
  if (afterGen <= beforeGen) throw new Error(`flag generation did not advance (${beforeGen} -> ${afterGen})`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
