/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Demo of the exceptions on the computed columns of ES|QL rules.
 *
 *   node esql_exceptions_demo.mjs                 creates the data, the exception lists, the rules, waits for their first run and prints the results
 *   node esql_exceptions_demo.mjs --refresh-data  writes the documents again with new timestamps (the rules and lists stay)
 *   node esql_exceptions_demo.mjs --clean         removes everything that the demo created
 *
 * Environment: KBN_URL (default http://localhost:5601/kbn), ES_URL (default http://localhost:9201), ES_USER and ES_PASS (default elastic and changeme).
 * This file is for the demo only and must not be committed.
 */

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9201';
const auth =
  'Basic ' +
  Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString(
    'base64'
  );
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
    body: body === undefined ? undefined : ndjson ? body : JSON.stringify(body),
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
const must = (label, r) => {
  if (r.status >= 400)
    throw new Error(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ALERTS = '/.alerts-security.alerts-default';
const OUTPUT_COLUMNS = 'esql_output_columns';
const LOG_SETTING = 'securitySolution:extendedRuleExecutionLoggingMinLevel';
const INTERNAL = { 'x-elastic-internal-origin': 'kibana', 'elastic-api-version': '1' };

// ---------------------------------------------------------------------------------------------
// The data

const MINUTE = 60 * 1000;
const stamp = (minutesAgo) => new Date(Date.now() - minutesAgo * MINUTE).toISOString();
// a number that depends on the position, so that the documents are the same on every run
const pick = (list, i) => list[i % list.length];

const NETWORKS = [
  ['10.20.1', 34, 'Corporate VPN exit'],
  ['10.20.2', 28, 'Corporate VPN exit'],
  ['198.51.100', 41, 'Partner vulnerability scanner'],
  ['203.0.113', 57, 'Real attack'],
  ['192.0.2', 25, 'Real attack'],
  ['100.64.7', 22, 'Real attack'],
  ['172.16.5', 9, 'Below the threshold'],
];
const USERS = ['admin', 'svc-backup', 'jsmith', 'mlopez', 'dkim', 'root'];

const TRANSFERS = [
  ['backup-01', 'storage.backup.example.com', 2400000000],
  ['build-07', 'registry.corp.example.com', 1100000000],
  ['laptop-ben', 'updates.corp.example.com', 700000000],
  ['laptop-ana', 'files.sharecloud.example.net', 900000000],
  ['db-02', 'paste.example.org', 650000000],
  ['laptop-eva', 'cdn.example.net', 120000000],
];

const authDocuments = () => {
  const documents = [];
  for (const [prefix, failures] of NETWORKS) {
    for (let i = 0; i < failures; i++) {
      documents.push({
        id: `auth-${prefix}-${i}`,
        doc: {
          '@timestamp': stamp(2 + ((i * 7) % 24)),
          'event.outcome': 'failure',
          'source.ip': `${prefix}.${10 + i}`,
          'user.name': pick(USERS, i),
          'host.name': `srv-${1 + (i % 3)}`,
        },
      });
    }
  }
  for (let i = 0; i < 20; i++) {
    documents.push({
      id: `auth-ok-${i}`,
      doc: {
        '@timestamp': stamp(3 + i),
        'event.outcome': 'success',
        'source.ip': `10.20.1.${100 + i}`,
        'user.name': pick(USERS, i),
        'host.name': `srv-${1 + (i % 3)}`,
      },
    });
  }
  return documents;
};

const networkDocuments = () =>
  TRANSFERS.flatMap(([host, domain, bytes]) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `net-${host}-${i}`,
      doc: {
        '@timestamp': stamp(2 + ((i * 5) % 25)),
        'host.name': host,
        'user.name': host.startsWith('laptop') ? host.replace('laptop-', '') : 'svc-' + host,
        'destination.domain': domain,
        'network.bytes': bytes / 10,
      },
    }))
  );

const INDICES = {
  'demo-auth': {
    properties: {
      '@timestamp': { type: 'date' },
      'event.outcome': { type: 'keyword' },
      'source.ip': { type: 'ip' },
      'user.name': { type: 'keyword' },
      'host.name': { type: 'keyword' },
    },
    documents: authDocuments,
  },
  'demo-network': {
    properties: {
      '@timestamp': { type: 'date' },
      'host.name': { type: 'keyword' },
      'user.name': { type: 'keyword' },
      'destination.domain': { type: 'keyword' },
      'network.bytes': { type: 'long' },
    },
    documents: networkDocuments,
  },
};

const writeDocuments = async (index) => {
  const lines = INDICES[index]
    .documents()
    .flatMap(({ id, doc }) => [
      JSON.stringify({ index: { _index: index, _id: id } }),
      JSON.stringify(doc),
    ]);
  const result = must(
    `bulk ${index}`,
    await es('/_bulk?refresh=true', 'POST', lines.join('\n') + '\n', true)
  );
  if (result.errors)
    throw new Error('bulk: ' + JSON.stringify(result.items.find((i) => i.index.error)));
  return lines.length / 2;
};

const createIndices = async () => {
  for (const [index, { properties }] of Object.entries(INDICES)) {
    must(`index ${index}`, await es(`/${index}`, 'PUT', { mappings: { properties } }));
    console.log(`  ${index}: ${await writeDocuments(index)} documents`);
  }
};

// ---------------------------------------------------------------------------------------------
// The rules and their exceptions

const FAILED_LOGINS_QUERY = `FROM demo-auth
| WHERE event.outcome == "failure"
| EVAL Esql.source_network = IP_PREFIX(source.ip, 24, 0)
| STATS Esql.failed_count = COUNT(*) BY Esql.source_network
| WHERE Esql.failed_count >= 20`;

const TRANSFER_QUERY = `FROM demo-network
| STATS Esql.total_bytes = SUM(network.bytes) BY host.name, Esql.destination_domain = destination.domain
| WHERE Esql.total_bytes >= 500000000`;

const column = (field, columnType, entry) => ({ field, value_type: columnType, ...entry });
const is = (field, columnType, value) =>
  column(field, columnType, { type: 'match', operator: 'included', value });
const isOneOf = (field, columnType, value) =>
  column(field, columnType, { type: 'match_any', operator: 'included', value });
const matches = (field, columnType, value) =>
  column(field, columnType, { type: 'wildcard', operator: 'included', value });
const isNot = (field, columnType, value) =>
  column(field, columnType, { type: 'match', operator: 'excluded', value });

const yesterday = () => new Date(Date.now() - 24 * 60 * MINUTE).toISOString();
const manyRanges = Array.from({ length: 250 }, (_, i) => `10.${i + 1}.0.0/16`);

/**
 * `expect` is what the demo should show:
 * - status: the status of the last run
 * - networks / hosts: the values that the alerts must have
 * - alerts: the number of alerts
 */
const CASES = [
  {
    n: 1,
    rule: 'Case 1. Demo: Many failed logins from one network',
    list: 'Demo case 1: Corporate VPN and partner scanners',
    description: 'Alert when a network has 20 or more failed logins.',
    query: FAILED_LOGINS_QUERY,
    items: [
      {
        id: 'corporate-vpn-exit',
        name: 'Corporate VPN exit',
        description: 'The VPN of the company leaves through 10.20.0.0/16',
        entries: [is('Esql.source_network', 'ip', '10.20.0.0/16')],
      },
      {
        id: 'partner-scanners',
        name: 'Partner scanners',
        description: 'Vulnerability scanners of a partner',
        entries: [isOneOf('Esql.source_network', 'ip', ['198.51.100.0', '198.18.0.0'])],
      },
    ],
    expect: {
      status: 'succeeded',
      alerts: 3,
      values: ['100.64.7.0', '192.0.2.0', '203.0.113.0'],
      applied: ['corporate-vpn-exit', 'partner-scanners'],
      notApplied: [],
    },
  },
  {
    n: 2,
    rule: 'Case 2. Demo: Large outbound transfer per host',
    list: 'Demo case 2: Backup server and internal destinations',
    description: 'Alert when a host sends 500 MB or more to one destination.',
    query: TRANSFER_QUERY,
    items: [
      {
        id: 'backup-server',
        name: 'Backup server',
        description:
          'The backup server sends large volumes by design (a source field, it stays in the DSL filter)',
        appliesTo: 'source_documents',
        entries: [{ field: 'host.name', type: 'match', operator: 'included', value: 'backup-01' }],
      },
      {
        id: 'internal-destinations',
        name: 'Internal destinations',
        description: 'Transfers to the corporate domain',
        entries: [matches('Esql.destination_domain', 'keyword', '*.corp.example.com')],
      },
    ],
    expect: {
      status: 'succeeded',
      alerts: 2,
      values: ['db-02', 'laptop-ana'],
      applied: ['internal-destinations'],
      notApplied: [],
    },
  },
  {
    n: 3,
    rule: 'Case 3. Demo: Failed logins with stale exceptions',
    list: 'Demo case 3: Stale exceptions',
    description: 'The query of case 1 with exceptions that cannot apply.',
    query: FAILED_LOGINS_QUERY,
    items: [
      {
        id: 'old-scanner-exception',
        name: 'Old scanner exception',
        description: 'Expired yesterday',
        expireTime: yesterday(),
        entries: [is('Esql.source_network', 'ip', '203.0.113.0')],
      },
      {
        id: 'country-exception',
        name: 'Country exception',
        description: 'On a column that the query does not output',
        entries: [is('Esql.source_country', 'keyword', 'DE')],
      },
    ],
    expect: {
      status: 'succeeded',
      alerts: 6,
      values: ['10.20.1.0', '10.20.2.0', '100.64.7.0', '192.0.2.0', '198.51.100.0', '203.0.113.0'],
      applied: [],
      notApplied: ['country-exception:item_never_matches'],
    },
  },
  {
    n: 4,
    rule: 'Case 4. Demo: Wrong column type',
    list: 'Demo case 4: Wrong column type',
    description: 'The exception declares keyword for a column that the query outputs as long.',
    query: FAILED_LOGINS_QUERY,
    items: [
      {
        id: 'failed-count-as-text',
        name: 'Failed count as text',
        description: 'Esql.failed_count is a long',
        entries: [is('Esql.failed_count', 'keyword', '25')],
      },
    ],
    expect: { status: 'failed', alerts: 0, message: 'declare a column type' },
  },
  {
    n: 5,
    rule: 'Case 5. Demo: Too many comparisons',
    list: 'Demo case 5: Too many comparisons',
    description: 'One exception with 250 CIDR ranges, and the limit is 200 comparisons.',
    query: FAILED_LOGINS_QUERY,
    items: [
      {
        id: 'many-ranges',
        name: 'Many ranges',
        description: '250 CIDR ranges',
        entries: [isOneOf('Esql.source_network', 'ip', manyRanges)],
      },
    ],
    expect: { status: 'failed', alerts: 0, message: 'comparisons' },
  },
  {
    n: 6,
    rule: 'Case 6. Demo: Exception that matches every row',
    list: 'Demo case 6: Matches every row',
    description: 'An exclusive operator on a column that the query does not output.',
    query: FAILED_LOGINS_QUERY,
    items: [
      {
        id: 'everything-but-us',
        name: 'Everything but US',
        description: 'Esql.source_country is not US, on a column that the query does not output',
        entries: [isNot('Esql.source_country', 'keyword', 'US')],
      },
    ],
    expect: { status: 'partial failure', alerts: 0 },
  },
];

const ruleIdOf = ({ n }) => `demo-esql-exceptions-${n}`;
const listIdOf = ({ n }) => `demo-esql-exceptions-list-${n}`;

const itemBody = (listId, item) => ({
  list_id: listId,
  item_id: item.id,
  name: item.name,
  description: item.description,
  type: 'simple',
  namespace_type: 'single',
  applies_to: item.appliesTo ?? OUTPUT_COLUMNS,
  entries: item.entries,
  ...(item.expireTime ? { expire_time: item.expireTime } : {}),
});

// ---------------------------------------------------------------------------------------------
// Clean

const clean = async () => {
  for (const c of CASES) {
    await kbn(`/api/detection_engine/rules?rule_id=${ruleIdOf(c)}`, 'DELETE');
    await kbn(`/api/exception_lists?list_id=${listIdOf(c)}&namespace_type=single`, 'DELETE');
  }
  await es(`${ALERTS}/_delete_by_query?refresh=true&conflicts=proceed`, 'POST', {
    query: { wildcard: { 'kibana.alert.rule.name': 'Case * Demo:*' } },
  });
  for (const index of Object.keys(INDICES)) await es(`/${index}`, 'DELETE');
};

// ---------------------------------------------------------------------------------------------
// Setup

const ensureLogSetting = async () => {
  const current = await kbn('/internal/kibana/settings', 'GET', undefined, INTERNAL);
  const value = current.body?.settings?.[LOG_SETTING]?.userValue;
  console.log(`  ${LOG_SETTING}: ${value === undefined ? '(default)' : value}`);
  if (value !== 'info') {
    must(
      'setting',
      await kbn(
        '/internal/kibana/settings',
        'POST',
        { changes: { [LOG_SETTING]: 'info' } },
        INTERNAL
      )
    );
    console.log(`  set to info (before: ${value === undefined ? 'unset, the default' : value})`);
  }
};

const createCase = async (c) => {
  const list = must(
    `list ${c.n}`,
    await kbn('/api/exception_lists', 'POST', {
      list_id: listIdOf(c),
      name: c.list,
      description: c.description,
      type: 'detection',
      namespace_type: 'single',
    })
  );
  for (const item of c.items) {
    must(
      `item ${item.id}`,
      await kbn('/api/exception_lists/items', 'POST', itemBody(listIdOf(c), item))
    );
  }
  const rule = must(
    `rule ${c.n}`,
    await kbn('/api/detection_engine/rules', 'POST', {
      rule_id: ruleIdOf(c),
      name: c.rule,
      description: c.description,
      type: 'esql',
      language: 'esql',
      query: c.query,
      risk_score: 47,
      severity: 'medium',
      // the script disables each rule after its first run, and the interval keeps a second run from creating the alerts again until then
      interval: '1h',
      from: 'now-2h',
      enabled: true,
      tags: ['Demo'],
      exceptions_list: [
        { id: list.id, list_id: listIdOf(c), type: 'detection', namespace_type: 'single' },
      ],
    })
  );
  return rule;
};

const flatten = (object, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(object ?? {})) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, out);
    else out[path] = value;
  }
  return out;
};

const waitForRun = async (rule) => {
  let last;
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    last = (await kbn(`/api/detection_engine/rules?id=${rule.id}`)).body?.execution_summary
      ?.last_execution;
    if (last && !['running', 'going to run'].includes(last.status)) return last;
    if (i === 30) {
      await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, INTERNAL);
    }
  }
  return last;
};

const readLogEntry = async (rule) => {
  for (let i = 0; i < 6; i++) {
    const events = await es('/.kibana-event-log-*/_search', 'POST', {
      size: 20,
      sort: [{ '@timestamp': 'desc' }],
      _source: ['message'],
      query: {
        bool: {
          filter: [
            { term: { 'event.provider': 'securitySolution.ruleExecution' } },
            { term: { 'event.action': 'message' } },
            { term: { 'rule.id': rule.id } },
          ],
        },
      },
    });
    const found = events.body?.hits?.hits
      ?.map((h) => h._source.message)
      .find((m) => typeof m === 'string' && m.startsWith('{"type":"esql_exceptions"'));
    if (found) return JSON.parse(found);
    await sleep(2000);
  }
  return undefined;
};

const sameList = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

const report = async (c, rule, last) => {
  await es(`${ALERTS}/_refresh`, 'POST');
  const alerts = must(
    'alerts',
    await es(`${ALERTS}/_search`, 'POST', {
      size: 100,
      query: { term: { 'kibana.alert.rule.uuid': rule.id } },
    })
  ).hits.hits.map((h) => flatten(h._source));
  const key = c.query === TRANSFER_QUERY ? 'host.name' : 'Esql.source_network';
  const values = alerts.map((a) => String(a[key])).sort();
  const log = await readLogEntry(rule);
  const e = c.expect;
  const checks = [
    ['status', last?.status === e.status, `${last?.status} (expected ${e.status})`],
    ['alerts', alerts.length === e.alerts, `${alerts.length} (expected ${e.alerts})`],
  ];
  if (e.values) checks.push(['alerted for', sameList(values, e.values), values.join(', ')]);
  if (e.message)
    checks.push(['message', (last?.message ?? '').includes(e.message), `contains "${e.message}"`]);
  if (e.applied && log) {
    checks.push([
      'applied at the end',
      sameList(
        log.appliedAtEndOfQuery.map((i) => i.item_id),
        e.applied
      ),
      JSON.stringify(log.appliedAtEndOfQuery.map((i) => i.item_id)),
    ]);
    checks.push([
      'not applied',
      sameList(
        log.notApplied.map((i) => `${i.item_id}:${i.code}`),
        e.notApplied
      ),
      JSON.stringify(log.notApplied.map((i) => `${i.item_id}:${i.code}`)),
    ]);
  }
  console.log(`\n${c.rule}`);
  for (const [label, ok, detail] of checks)
    console.log(`  ${ok ? 'OK  ' : 'DIFF'} ${label}: ${detail}`);
  if (last?.message && last.status !== 'succeeded')
    console.log(`  message of the rule: ${last.message.slice(0, 600)}`);
  if (log)
    console.log(
      `  final query in the log:\n${log.query
        .split('\n')
        .map((l) => '    ' + l)
        .join('\n')}`
    );
  else console.log('  (no esql_exceptions message in the log)');
  return checks.every(([, ok]) => ok);
};

const setup = async () => {
  console.log('Cleaning what an earlier run created');
  await clean();
  console.log('Advanced setting');
  await ensureLogSetting();
  console.log('Indices');
  await createIndices();
  console.log('Lists and rules');
  const created = [];
  for (const c of CASES) {
    created.push([c, await createCase(c)]);
    console.log(`  case ${c.n}: ${c.rule}`);
  }
  console.log('\nWaiting for the first run of each rule');
  const lasts = await Promise.all(created.map(([, rule]) => waitForRun(rule)));
  await sleep(3000);
  let allOk = true;
  for (let i = 0; i < created.length; i++) {
    const [c, rule] = created[i];
    const ok = await report(c, rule, lasts[i]);
    allOk = ok && allOk;
    if (ok) {
      // the rule ran once and showed what it should: disable it, so that it makes no noise while the demo is recorded
      must(
        `disable ${c.n}`,
        await kbn('/api/detection_engine/rules', 'PATCH', { id: rule.id, enabled: false })
      );
      console.log('  rule disabled');
    } else {
      console.log('  rule left enabled, because the result differs from the plan');
    }
  }
  console.log(
    allOk
      ? '\nEvery case shows what the plan expects, and every rule is disabled.'
      : '\nSome cases differ from the plan.'
  );
  process.exitCode = allOk ? 0 : 2;
};

const args = process.argv.slice(2);
if (args.includes('--clean')) {
  await clean();
  console.log('Removed the rules of the cases, their alerts, the exception lists and the indices.');
  console.log(
    `The advanced setting ${LOG_SETTING} stays at info. To reset it: POST /internal/kibana/settings with {"changes":{"${LOG_SETTING}":null}}.`
  );
} else if (args.includes('--refresh-data')) {
  for (const index of Object.keys(INDICES))
    console.log(`${index}: ${await writeDocuments(index)} documents`);
} else {
  await setup();
}
