/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs ES|QL rules with alert suppression and exceptions through a live Kibana, and checks that the exceptions exclude rows
// before the alerts are created or suppressed: an excluded row creates no alert and does not count as a suppressed document.
//
//   node esql_exceptions_suppression.mjs
//
// The rule groups by `host` and has two exception items: `tier is GOLD` on a column that the query computes (applied at the end of
// the query) and `user is svc` on a source field (applied in the DSL filter).
//   1. setting enabled, suppression per rule execution
//   2. setting disabled, suppression per rule execution: the exception on the computed column is not applied
//   3. setting enabled, suppression over 30 minutes: a second run adds documents, and only the ones that are not excluded
//      create alerts or raise the suppressed count
// The script changes the advanced setting and puts it back, and removes what it creates. It needs a running stack and never starts one.

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth =
  'Basic ' +
  Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString(
    'base64'
  );
const SETTING_ID = 'securitySolution:enableEsqlRuleComputedFieldExceptions';
const INDEX = 'esql_suppression_try';
const LIST_ID = 'esql-suppression-list';
const RULE_ID = 'esql-suppression-rule';

const send = async (base, path, method = 'GET', body, extra = {}, ndjson = false) => {
  const res = await fetch(base + path, {
    method,
    headers: {
      Authorization: auth,
      'Content-Type': ndjson ? 'application/x-ndjson' : 'application/json',
      'kbn-xsrf': 'x',
      'elastic-api-version': '2023-10-31',
      ...extra,
    },
    body: body === undefined || ndjson ? body : JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return { status: res.status, body: text ? JSON.parse(text) : null };
  } catch {
    return { status: res.status, body: text };
  }
};
const es = (p, m, b, nd) => send(ES, p, m, b, {}, nd);
const kbn = (p, m, b, extra) => send(KBN, p, m, b, extra);
const INTERNAL = { 'x-elastic-internal-origin': 'kibana' };
const must = (label, r) => {
  if (r.status >= 400)
    throw new Error(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const doc = (id, host, tier, user = 'bob') => ({ doc: id, host, user, tier_src: tier });
const FIRST_DOCS = [
  ...['a1', 'a2', 'a3', 'a4'].map((id) => doc(id, 'host-a', 'gold')),
  ...['b1', 'b2', 'b3'].map((id) => doc(id, 'host-b', 'silver')),
  ...['c1', 'c2'].map((id) => doc(id, 'host-c', 'silver')),
  doc('c3', 'host-c', 'gold'),
  ...['d1', 'd2'].map((id) => doc(id, 'host-d', 'silver', 'svc')),
  doc('e1', 'host-e', 'silver', 'svc'),
  doc('e2', 'host-e', 'silver'),
];
const SECOND_DOCS = [
  ...['a5', 'a6'].map((id) => doc(id, 'host-a', 'gold')),
  doc('b4', 'host-b', 'silver'),
  doc('b5', 'host-b', 'gold'),
  doc('c4', 'host-c', 'gold'),
  doc('e3', 'host-e', 'silver'),
  doc('f1', 'host-f', 'silver'),
  doc('f2', 'host-f', 'gold'),
];

const QUERY = `FROM ${INDEX} METADATA _id | EVAL tier = TO_UPPER(tier_src) | KEEP _id, doc, host, user, tier`;

// host -> the number of suppressed documents of its alert (a single document has 0)
const SCENARIOS = [
  {
    name: '1. setting enabled, suppression per rule execution',
    setting: true,
    duration: undefined,
    expectedFirstRun: { 'host-b': 2, 'host-c': 1, 'host-e': 0 },
  },
  {
    name: '2. setting disabled, suppression per rule execution (the computed column is not applied)',
    setting: false,
    duration: undefined,
    expectedFirstRun: { 'host-a': 3, 'host-b': 2, 'host-c': 2, 'host-e': 0 },
  },
  {
    name: '3. setting enabled, suppression over 30 minutes, a second run with more documents',
    setting: true,
    duration: { value: 30, unit: 'm' },
    expectedFirstRun: { 'host-b': 2, 'host-c': 1, 'host-e': 0 },
    expectedSecondRun: { 'host-b': 3, 'host-c': 1, 'host-e': 1, 'host-f': 0 },
  },
];

const createIndex = async () =>
  must(
    'index',
    await es(`/${INDEX}`, 'PUT', {
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          doc: { type: 'keyword' },
          host: { type: 'keyword' },
          user: { type: 'keyword' },
          tier_src: { type: 'keyword' },
        },
      },
    })
  );

const bulk = async (docs) => {
  const now = new Date().toISOString();
  const body =
    docs
      .flatMap((d) => [JSON.stringify({ index: {} }), JSON.stringify({ '@timestamp': now, ...d })])
      .join('\n') + '\n';
  const result = must('bulk', await es(`/${INDEX}/_bulk?refresh=true`, 'POST', body, true));
  if (result.errors)
    throw new Error('bulk: ' + JSON.stringify(result.items.find((i) => i.index.error)));
};

const lastExecution = async (ruleUuid) =>
  (await kbn(`/api/detection_engine/rules?id=${ruleUuid}`)).body?.execution_summary?.last_execution;

// Waits for an execution that started after `after` and has ended
const waitForExecution = async (ruleUuid, after) => {
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const last = await lastExecution(ruleUuid);
    if (last && new Date(last.date) > after && !['running', 'going to run'].includes(last.status))
      return last;
  }
  throw new Error('The rule did not finish an execution in 3 minutes');
};

const readAlerts = async (ruleUuid) => {
  await es('/.alerts-security.alerts-default/_refresh', 'POST');
  const result = await es('/.alerts-security.alerts-default/_search', 'POST', {
    size: 100,
    _source: [
      'kibana.alert.suppression.terms',
      'kibana.alert.suppression.docs_count',
      'kibana.alert.ancestors',
    ],
    query: { term: { 'kibana.alert.rule.uuid': ruleUuid } },
  });
  const alerts = {};
  for (const hit of result.body.hits.hits) {
    const source = hit._source;
    const host = source['kibana.alert.suppression.terms']?.[0]?.value;
    const count = source['kibana.alert.suppression.docs_count'];
    alerts[host ?? '(no host)'] = count ?? null;
  }
  return alerts;
};

const sameAlerts = (actual, expected) =>
  JSON.stringify(Object.entries(actual).sort()) === JSON.stringify(Object.entries(expected).sort());

const setSetting = async (value) => {
  must(
    'setting',
    await kbn('/internal/kibana/settings', 'POST', { changes: { [SETTING_ID]: value } }, INTERNAL)
  );
  // the server keeps the value of the setting for 10 seconds
  await sleep(11000);
};

const removeAll = async () => {
  await kbn(`/api/detection_engine/rules?rule_id=${RULE_ID}`, 'DELETE');
  await es('/.alerts-security.alerts-*/_delete_by_query?refresh=true&conflicts=proceed', 'POST', {
    query: { term: { 'kibana.alert.rule.rule_id': RULE_ID } },
  });
};

let previousSetting;
let exitCode = 0;
try {
  previousSetting = (await kbn('/internal/kibana/settings', 'GET', undefined, INTERNAL)).body
    ?.settings?.[SETTING_ID]?.userValue;

  await removeAll();
  await kbn(`/api/exception_lists?list_id=${LIST_ID}&namespace_type=single`, 'DELETE');
  await es(`/${INDEX}`, 'DELETE');
  await createIndex();
  const list = must(
    'exception list',
    await kbn('/api/exception_lists', 'POST', {
      list_id: LIST_ID,
      name: LIST_ID,
      description: 'suppression try',
      type: 'detection',
      namespace_type: 'single',
    })
  );
  for (const [itemId, field, value] of [
    ['tier', 'tier', 'GOLD'],
    ['user', 'user', 'svc'],
  ])
    must(
      `exception ${itemId}`,
      await kbn('/api/exception_lists/items', 'POST', {
        list_id: LIST_ID,
        item_id: `${LIST_ID}-${itemId}`,
        name: `${field} is ${value}`,
        description: 'suppression try',
        type: 'simple',
        namespace_type: 'single',
        entries: [{ field, operator: 'included', type: 'match', value }],
      })
    );

  console.log(`Rule query: ${QUERY}`);
  console.log('Exceptions: "tier is GOLD" (computed column) and "user is svc" (source field)\n');

  for (const scenario of SCENARIOS) {
    console.log(scenario.name);
    await removeAll();
    await es(`/${INDEX}`, 'DELETE');
    await createIndex();
    await bulk(FIRST_DOCS);
    await setSetting(scenario.setting);

    const started = new Date();
    const rule = must(
      'rule',
      await kbn('/api/detection_engine/rules', 'POST', {
        rule_id: RULE_ID,
        name: 'ES|QL exceptions with alert suppression',
        description: 'try',
        type: 'esql',
        language: 'esql',
        query: QUERY,
        risk_score: 21,
        severity: 'low',
        from: 'now-1h',
        interval: '5m',
        enabled: true,
        exceptions_list: [
          { id: list.id, list_id: LIST_ID, type: 'detection', namespace_type: 'single' },
        ],
        alert_suppression: {
          group_by: ['host'],
          missing_fields_strategy: 'suppress',
          ...(scenario.duration ? { duration: scenario.duration } : {}),
        },
      })
    );
    const first = await waitForExecution(rule.id, started);
    const firstAlerts = await readAlerts(rule.id);
    const firstOk =
      first.status === 'succeeded' && sameAlerts(firstAlerts, scenario.expectedFirstRun);
    console.log(`  first run: status ${first.status}`);
    console.log(`    expected ${JSON.stringify(scenario.expectedFirstRun)}`);
    console.log(`    actual   ${JSON.stringify(firstAlerts)}  ${firstOk ? 'OK' : 'DIFFERS'}`);
    if (!firstOk) exitCode = 2;

    if (scenario.expectedSecondRun) {
      await bulk(SECOND_DOCS);
      const secondStarted = new Date();
      await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, {
        ...INTERNAL,
        'elastic-api-version': '1',
      });
      const second = await waitForExecution(rule.id, secondStarted);
      const secondAlerts = await readAlerts(rule.id);
      const secondOk =
        second.status === 'succeeded' && sameAlerts(secondAlerts, scenario.expectedSecondRun);
      console.log(`  second run: status ${second.status}`);
      console.log(`    expected ${JSON.stringify(scenario.expectedSecondRun)}`);
      console.log(`    actual   ${JSON.stringify(secondAlerts)}  ${secondOk ? 'OK' : 'DIFFERS'}`);
      if (!secondOk) exitCode = 2;
    }
    console.log();
  }
} finally {
  await removeAll();
  await kbn(`/api/exception_lists?list_id=${LIST_ID}&namespace_type=single`, 'DELETE');
  await es(`/${INDEX}`, 'DELETE');
  await kbn(
    '/internal/kibana/settings',
    'POST',
    { changes: { [SETTING_ID]: previousSetting ?? null } },
    INTERNAL
  );
  console.log(`The setting is back to ${previousSetting ?? 'its default'}`);
}
console.log(exitCode === 0 ? 'Every check matched.' : 'At least one check DIFFERS.');
process.exitCode = exitCode;
