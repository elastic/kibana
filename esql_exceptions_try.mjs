/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createInterface } from 'node:readline/promises';

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
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
    throw new Error(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return r.body;
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const TYPES = {
  keyword: {
    value: 'good.com',
    docValue: 'good.com',
    other: 'other.com',
    list: ['good.com', 'bad.com'],
    pattern: 'good*',
  },
  text: {
    value: 'good.com',
    docValue: 'good.com',
    other: 'something else entirely',
    list: ['good.com', 'other phrase'],
    pattern: 'good*',
  },
  integer: { value: '42', docValue: 42, other: 7, list: ['42', '43'], pattern: '4*' },
  long: {
    value: '9000000000',
    docValue: 9000000000,
    other: 5,
    list: ['9000000000', '1'],
    pattern: '9*',
  },
  unsigned_long: {
    value: '18446744073709551615',
    docValue: '18446744073709551615',
    other: 5,
    list: ['18446744073709551615', '1'],
    pattern: '1844*',
  },
  double: { value: '3.14', docValue: 3.14, other: 1.5, list: ['3.14', '2.5'], pattern: '3*' },
  boolean: { value: 'true', docValue: true, other: false, list: ['true'], pattern: 't*' },
  ip: {
    value: '10.0.0.9',
    docValue: '10.0.0.9',
    other: '192.168.0.1',
    list: ['10.0.0.9', '10.0.0.10'],
    pattern: '10.*',
  },
  version: {
    value: '1.2.3',
    docValue: '1.2.3',
    other: '2.0.0',
    list: ['1.2.3', '1.2.4'],
    pattern: '1.*',
  },
  date: {
    value: '2026-10-01',
    docValue: '2026-10-01T08:00:00Z',
    other: '2026-08-01T08:00:00Z',
    list: ['2026-10-01', '2026-09-01'],
    pattern: '2026*',
  },
  date_nanos: {
    value: '2026-10-01',
    docValue: '2026-10-01T08:00:00.123456789Z',
    other: '2026-08-01T08:00:00.123456789Z',
    list: ['2026-10-01', '2026-09-01'],
    pattern: '2026*',
  },
};
const INVALID_VALUES = {
  integer: 'many',
  long: 'many',
  unsigned_long: 'many',
  double: 'many',
  boolean: 'maybe',
  ip: 'bogus',
  version: 'not-a-version',
  date: 'not-a-date',
  date_nanos: 'not-a-date',
};
const OPERATORS = [
  'is',
  'is_not',
  'is_one_of',
  'is_not_one_of',
  'matches',
  'does_not_match',
  'exists',
  'does_not_exist',
];
const OPERATOR_LABELS = {
  is: 'is',
  is_not: 'is not',
  is_one_of: 'is one of',
  is_not_one_of: 'is not one of',
  matches: 'matches',
  does_not_match: 'does not match',
  exists: 'exists',
  does_not_exist: 'does not exist',
};
const KINDS = ['source', 'computed', 'redefined', 'missing'];
const KIND_HELP =
  'Where the field lives: in the source documents, in a column that the query computes, in a source field that the query redefines, or nowhere';
// A redefined field of a keyword or text type becomes its uppercase value (EVAL f = TO_UPPER(f)); the other types keep their value (EVAL f = f)
const SHOWN_TYPES = ['keyword', 'text'];
const toShown = (value) => String(value).toUpperCase();
const IN_DSL_KINDS = ['source', 'redefined'];

// What Elasticsearch and the executor do with a value or an operator that the type does not support.
const WILDCARD_TYPES = ['keyword', 'text', 'version'];
const DSL_FAILS_ON_INVALID = (type) => type !== 'version';
// At the end of the query a value that the stage cannot write fails the rule, for every type except double, where "is" and "is one of" are not applied whatever the value.
const END_FAILS_ON_INVALID = (type) => type !== 'double';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('='))
);
if (!['on', 'off'].includes(args.setting ?? 'on')) throw new Error('--setting must be on or off');
const settingOn = (args.setting ?? 'on') === 'on';

const rl = createInterface({ input: process.stdin });
const lines = rl[Symbol.asyncIterator]();
const ask = async (label) => {
  process.stdout.write(label);
  const { value, done } = await lines.next();
  if (done) throw new Error('\nThe input ended before all the questions were answered');
  if (!process.stdin.isTTY) process.stdout.write(`${value}\n`);
  return value;
};
const choose = async (label, options) => {
  const answer = (await ask(`${label} (${options.join(' | ')}): `)).trim();
  const exact = options.find((o) => o === answer);
  const prefixed = options.filter((o) => o.startsWith(answer));
  const picked = exact ?? (answer && prefixed.length === 1 ? prefixed[0] : undefined);
  if (picked === undefined) throw new Error(`"${answer}" is not one of: ${options.join(', ')}`);
  return picked;
};
const yesNo = async (label) => {
  const answer = (await ask(`${label} (yes | no) [no]: `)).trim().toLowerCase();
  return answer === 'yes' || answer === 'y';
};

let itemCount = 0;
const askItem = async () => {
  const id = ++itemCount;
  const kind = await choose(`    ${KIND_HELP}`, KINDS);
  const type = await choose('    Field type', Object.keys(TYPES));
  const operator = await choose('    Operator', OPERATORS);
  const base = operator
    .replace(/^is_not/, 'is')
    .replace('does_not_match', 'matches')
    .replace('does_not_exist', 'exists');
  const included =
    !operator.startsWith('is_not') &&
    operator !== 'does_not_match' &&
    operator !== 'does_not_exist';
  const canBeInvalid = INVALID_VALUES[type] !== undefined && ['is', 'is_one_of'].includes(base);
  const invalid =
    canBeInvalid &&
    (await yesNo(
      `    Use a value that is not a ${type} (${JSON.stringify(INVALID_VALUES[type])})`
    ));
  let cfg = invalid
    ? {
        ...TYPES[type],
        value: INVALID_VALUES[type],
        list: [TYPES[type].list[0], INVALID_VALUES[type]],
      }
    : TYPES[type];
  if (kind === 'redefined' && SHOWN_TYPES.includes(type) && !invalid) {
    const mode = await choose(
      '    Does the exception hold the value of the source documents, or the uppercase value that the alert shows',
      ['source', 'shown']
    );
    if (mode === 'shown')
      cfg = {
        ...cfg,
        value: toShown(cfg.value),
        list: cfg.list.map(toShown),
        pattern: toShown(cfg.pattern),
      };
  }
  const field = {
    source: `f${id}`,
    computed: `c${id}`,
    redefined: `f${id}`,
    missing: `no_such_field_${id}`,
  }[kind];
  const operatorKey = included ? 'included' : 'excluded';
  const entry =
    base === 'is'
      ? { field, operator: operatorKey, type: 'match', value: cfg.value }
      : base === 'is_one_of'
      ? { field, operator: operatorKey, type: 'match_any', value: cfg.list }
      : base === 'matches'
      ? { field, operator: operatorKey, type: 'wildcard', value: cfg.pattern }
      : { field, operator: operatorKey, type: 'exists' };
  return {
    id,
    kind,
    type,
    operator,
    base,
    included,
    invalid,
    cfg,
    field,
    entry,
    sourceField: `f${id}`,
    upper: kind === 'redefined' && SHOWN_TYPES.includes(type),
  };
};

const exceptions = [];
do {
  console.log(`\nException ${exceptions.length + 1}: its items are joined with AND`);
  const items = [];
  do {
    console.log(`  Item ${items.length + 1}`);
    items.push(await askItem());
  } while (await yesNo(`  Add another item to exception ${exceptions.length + 1}?`));
  exceptions.push({ k: exceptions.length + 1, items });
} while (await yesNo('\nAdd another exception to the list?'));
rl.close();

const describeItem = (it) => {
  const value =
    it.base === 'exists'
      ? ''
      : ' ' +
        JSON.stringify(
          it.base === 'is_one_of'
            ? it.cfg.list
            : it.base === 'matches'
            ? it.cfg.pattern
            : it.cfg.value
        );
  return `${it.field} (${it.type}, ${it.kind}) ${OPERATOR_LABELS[it.operator]}${value}`;
};
const describeException = (ex) => ex.items.map(describeItem).join('  AND  ');

// Does the value of the field satisfy the operator, as the engines compare it. The DSL filter compares the analyzed text of a
// text source field; the end of the query compares a text column on the whole value, as a keyword column.
const holds = (it, v, view) => {
  if (v === undefined) return false;
  const analyzed = it.type === 'text' && view === 'dsl';
  const same = (x) =>
    analyzed
      ? String(v).toLowerCase().includes(x.toLowerCase())
      : it.type.startsWith('date')
      ? String(v).startsWith(x)
      : String(v) === x;
  if (it.base === 'is') return same(it.cfg.value);
  if (it.base === 'is_one_of') return it.cfg.list.some(same);
  if (it.base === 'matches') {
    const prefix = it.cfg.pattern.replace('*', '');
    return analyzed
      ? String(v)
          .toLowerCase()
          .split(/\s+/)
          .some((token) => token.startsWith(prefix))
      : String(v).startsWith(prefix);
  }
  return true;
};
const itemMatches = (it, v, view) => (it.included ? holds(it, v, view) : !holds(it, v, view));

// A document for each exception that only that exception excludes, and one that no exception excludes.
const isNegative = (it) => !it.included;
const buildDoc = (name, targetEx) => {
  const fields = {};
  for (const ex of exceptions) {
    if (ex === targetEx) {
      for (const it of ex.items) {
        if (it.kind === 'missing') continue;
        if (it.included) fields[it.sourceField] = TYPES[it.type].docValue;
        else if (it.base !== 'exists') fields[it.sourceField] = TYPES[it.type].other;
      }
    } else if (ex.items.every(isNegative)) {
      // an absent field satisfies a negative operator, so give one field the value that the operator excludes
      const breaker = ex.items.find((it) => it.kind !== 'missing');
      if (breaker) fields[breaker.sourceField] = TYPES[breaker.type].docValue;
    }
  }
  return { name, fields };
};
const docs = [
  buildDoc('survivor', undefined),
  ...exceptions.map((ex) => buildDoc(`target-${ex.k}`, ex)),
];

// An exception is placed whole, in one place: the DSL filter when every field is a source field (also a source field that the query
// redefines, which the DSL filter compares on the source value) or exists nowhere, and the end of the query otherwise, when it can take it.
const planFor = (on) => {
  const failures = [];
  const plans = exceptions.map((ex) => {
    // A field that exists nowhere stays in the DSL filter too, where a negative operator on it matches every document, as it does today.
    const inDsl = ex.items.every((it) => IN_DSL_KINDS.includes(it.kind) || it.kind === 'missing');
    // A "matches" or "exists" entry that is not negative on a field that exists nowhere makes Elasticsearch rewrite the whole item to
    // match nothing before it builds the other entries, so a wildcard or a value that it would reject on another entry does not fail the
    // query. An "is" or "is one of" entry, or a negative entry, does not: the other entry still fails. For the DSL filter a computed
    // column is such a field too (with the setting off, it is the DSL filter that gets the item).
    const neverMatches = ex.items.some(
      (it) =>
        (it.kind === 'missing' || it.kind === 'computed') &&
        it.included &&
        ['matches', 'exists'].includes(it.base)
    );
    const dslFailures = () =>
      ex.items.flatMap((it) => {
        if (neverMatches || !IN_DSL_KINDS.includes(it.kind)) return [];
        if (it.base === 'matches' && !WILDCARD_TYPES.includes(it.type))
          return [`Elasticsearch rejects a wildcard query on the ${it.type} field ${it.field}`];
        if (it.invalid && DSL_FAILS_ON_INVALID(it.type))
          return [
            `Elasticsearch rejects ${JSON.stringify(INVALID_VALUES[it.type])} on the ${
              it.type
            } field ${it.field}`,
          ];
        return [];
      });
    if (!on || inDsl) {
      failures.push(...dslFailures());
      return { status: 'dsl', text: 'stays in the DSL filter' };
    }
    // A negative entry on a field that exists nowhere is true for every row, so it is left out of the stage; any other entry on it never matches.
    if (ex.items.some((it) => it.kind === 'missing' && it.included))
      return {
        status: 'skipped',
        text: 'not applied (field_not_found): it has a computed column and an entry that is not negative on a field that is in neither the source nor the query output',
      };
    let skip;
    for (const it of ex.items) {
      if (it.kind === 'missing') continue;
      if (it.invalid && END_FAILS_ON_INVALID(it.type))
        failures.push(
          `Kibana fails the rule before the query runs (value_not_supported): ${JSON.stringify(
            INVALID_VALUES[it.type]
          )} cannot be written for a column of type ${it.type}`
        );
      else if (it.base === 'matches' && !['keyword', 'text'].includes(it.type))
        skip ??=
          'not applied (operator_not_supported_on_type): "matches" is only supported on keyword and text columns at the end of the query';
      else if (it.type === 'double' && it.base !== 'exists')
        skip ??=
          'not applied (operator_not_supported_on_type): "is" and "is one of" are not supported on double columns, because a float is widened to double';
    }
    return skip
      ? { status: 'skipped', text: skip }
      : { status: 'end', text: 'applied at the end of the query' };
  });
  return { plans, failures };
};

// The value that each engine compares: the DSL filter compares the source document, the end of the query compares the column.
const valueIn = (it, doc, view) => {
  const v = doc.fields[it.sourceField];
  if (view === 'dsl') return it.kind === 'computed' || it.kind === 'missing' ? undefined : v;
  if (it.kind === 'missing') return undefined;
  return it.upper && v !== undefined ? toShown(v) : v;
};

const outcomes = (plan) =>
  docs.map((d) => {
    const excludedBy = exceptions
      .filter((ex, i) => {
        const { status } = plan.plans[i];
        if (status !== 'dsl' && status !== 'end') return false;
        const view = status === 'dsl' ? 'dsl' : 'end';
        return ex.items.every((it) => itemMatches(it, valueIn(it, d, view), view));
      })
      .map((ex) => ex.k);
    return { ...d, excludedBy };
  });
const alertNames = (plan) =>
  plan.failures.length
    ? []
    : outcomes(plan)
        .filter((d) => d.excludedBy.length === 0)
        .map((d) => d.name);

// --suffix=x runs on its own index, list and rule, so that several runs (esql_exceptions_try_matrix.mjs) can go on at once
const suffix = args.suffix ? `-${args.suffix}` : '';
const INDEX = `esql_try${suffix.replace('-', '_')}`;
const LIST_ID = `esql-try-list${suffix}`;
const RULE_ID = `esql-try-rule${suffix}`;
const SETTING_ID = 'securitySolution:enableEsqlRuleComputedFieldExceptions';
const allItems = exceptions.flatMap((ex) => ex.items);
const computed = allItems.filter((it) => it.kind === 'computed');
const redefined = allItems.filter((it) => it.kind === 'redefined');
const sourceInMixed = exceptions
  .filter((ex) => ex.items.some((it) => it.kind !== 'source'))
  .flatMap((ex) => ex.items)
  .filter((it) => it.kind === 'source');
const query = [
  `FROM ${INDEX} METADATA _id`,
  computed.length || redefined.length
    ? `EVAL ${[
        ...computed.map((it) => `${it.field} = ${it.sourceField}`),
        ...redefined.map(
          (it) => `${it.field} = ${it.upper ? `TO_UPPER(${it.sourceField})` : it.sourceField}`
        ),
      ].join(', ')}`
    : undefined,
  `KEEP _id, doc${[...computed, ...redefined, ...sourceInMixed]
    .map((it) => ', ' + it.field)
    .join('')}`,
]
  .filter(Boolean)
  .join(' | ');

must(
  'setting',
  await kbn(
    '/internal/kibana/settings',
    'POST',
    { changes: { [SETTING_ID]: settingOn } },
    { 'x-elastic-internal-origin': 'kibana' }
  )
);
await kbn(`/api/detection_engine/rules?rule_id=${RULE_ID}`, 'DELETE');
await kbn(`/api/exception_lists?list_id=${LIST_ID}&namespace_type=single`, 'DELETE');
await es(`/${INDEX}`, 'DELETE');
// deleting a rule leaves its alerts behind, so the alerts of the earlier runs would add up in the Alerts page
await es('/.alerts-security.alerts-*/_delete_by_query?refresh=true&conflicts=proceed', 'POST', {
  query: { term: { 'kibana.alert.rule.rule_id': RULE_ID } },
});
const properties = { '@timestamp': { type: 'date' }, doc: { type: 'keyword' } };
for (const it of allItems)
  if (it.kind !== 'missing') properties[it.sourceField] = { type: it.type };
must('index', await es(`/${INDEX}`, 'PUT', { mappings: { properties } }));
const now = new Date().toISOString();
const bulk =
  docs
    .flatMap((d) => [
      JSON.stringify({ index: { _id: d.name } }),
      JSON.stringify({ '@timestamp': now, doc: d.name, ...d.fields }),
    ])
    .join('\n') + '\n';
const bulkResult = must('bulk', await es(`/${INDEX}/_bulk?refresh=true`, 'POST', bulk, true));
if (bulkResult.errors)
  throw new Error('bulk: ' + JSON.stringify(bulkResult.items.find((i) => i.index.error)));

const list = must(
  'exception list',
  await kbn('/api/exception_lists', 'POST', {
    list_id: LIST_ID,
    name: LIST_ID,
    description: 'try',
    type: 'detection',
    namespace_type: 'single',
  })
);
for (const ex of exceptions) {
  must(
    `exception ${ex.k}`,
    await kbn('/api/exception_lists/items', 'POST', {
      list_id: LIST_ID,
      item_id: `${LIST_ID}-${ex.k}`,
      name: `exception ${ex.k}`,
      description: describeException(ex),
      type: 'simple',
      namespace_type: 'single',
      entries: ex.items.map((it) => it.entry),
    })
  );
}
const rule = must(
  'rule',
  await kbn('/api/detection_engine/rules', 'POST', {
    rule_id: RULE_ID,
    name: 'ES|QL exceptions try',
    description: 'try',
    type: 'esql',
    language: 'esql',
    query,
    risk_score: 21,
    severity: 'low',
    from: 'now-1h',
    interval: '5m',
    enabled: true,
    exceptions_list: [
      { id: list.id, list_id: LIST_ID, type: 'detection', namespace_type: 'single' },
    ],
  })
);

const planOn = planFor(true);
const planOff = planFor(false);
const plan = settingOn ? planOn : planOff;
const other = settingOn ? planOff : planOn;
console.log(`\nAdvanced setting ${SETTING_ID}: ${settingOn ? 'enabled' : 'disabled'}`);
console.log(`Rule query: ${query}`);
console.log(
  '\nExceptions in the list (the items of an exception are joined with AND, the exceptions with OR):'
);
exceptions.forEach((ex, i) =>
  console.log(`  ${ex.k}. ${describeException(ex)}\n     ${plan.plans[i].text}`)
);
console.log('\nSource documents (each target document holds the unique fields of one exception):');
for (const d of outcomes(plan)) {
  const verdict = plan.failures.length
    ? '(the rule fails)'
    : d.excludedBy.length
    ? `excluded by exception ${d.excludedBy.join(', ')}`
    : 'alerts';
  console.log(`  ${d.name.padEnd(10)} ${JSON.stringify(d.fields).padEnd(72)} ${verdict}`);
}
const expectedAlerts = alertNames(plan);
console.log('\nWhat to expect:');
if (plan.failures.length) {
  console.log(`  The rule fails and creates no alerts. ${[...new Set(plan.failures)].join('; ')}`);
} else {
  console.log(`  Alerts for: ${expectedAlerts.join(', ') || '(none)'}`);
}
console.log(
  `  With the setting ${settingOn ? 'disabled' : 'enabled'} instead: ${
    other.failures.length
      ? 'the rule fails, ' + [...new Set(other.failures)].join('; ')
      : 'alerts for ' + (alertNames(other).join(', ') || '(none)')
  }`
);
const expectsLog =
  settingOn &&
  !plan.failures.length &&
  plan.plans.some((p) => p.status === 'end' || p.status === 'skipped');
console.log(
  expectsLog
    ? '  The execution log should have an esql_exceptions message with the final query.'
    : '  No esql_exceptions message: every exception stays in the DSL filter, or the rule fails first.'
);

await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, {
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
});
let last;
for (let i = 0; i < 40; i++) {
  await sleep(3000);
  last = (await kbn(`/api/detection_engine/rules?id=${rule.id}`)).body?.execution_summary
    ?.last_execution;
  if (last && last.status !== 'running' && last.status !== 'going to run' && i >= 2) break;
}
await sleep(3000);
await es('/.alerts-security.alerts-default/_refresh', 'POST');
const alerts = await es('/.alerts-security.alerts-default/_search', 'POST', {
  size: 100,
  _source: ['kibana.alert.ancestors'],
  query: { term: { 'kibana.alert.rule.uuid': rule.id } },
});
const alerted = alerts.body.hits.hits
  .map((h) => h._source['kibana.alert.ancestors']?.[0]?.id)
  .filter(Boolean)
  .sort();
console.log(
  `\nResult: rule status "${last?.status}"${
    last?.message && last.status !== 'succeeded' ? ': ' + last.message.slice(0, 1500) : ''
  }`
);
console.log(`Alerts created for: ${alerted.join(', ') || '(none)'}`);
const sameAlerts = JSON.stringify(alerted) === JSON.stringify([...expectedAlerts].sort());
const statusOk = plan.failures.length ? last?.status === 'failed' : last?.status === 'succeeded';
console.log(
  sameAlerts && statusOk ? 'This matches what to expect.' : 'This DIFFERS from what to expect.'
);
if (!(sameAlerts && statusOk)) process.exitCode = 2;

let entryLog;
for (let i = 0; i < (expectsLog ? 10 : 1) && !entryLog; i++) {
  const events = await es('/.kibana-event-log-*/_search', 'POST', {
    size: 50,
    sort: [{ '@timestamp': 'desc' }],
    _source: ['message', '@timestamp'],
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
  entryLog = events.body?.hits?.hits
    .map((h) => h._source.message)
    .find((m) => typeof m === 'string' && m.startsWith('{"type":"esql_exceptions"'));
  if (!entryLog && expectsLog) await sleep(3000);
}
if (entryLog) {
  const parsed = JSON.parse(entryLog);
  console.log('\nFinal ES|QL query from the rule execution log:\n');
  console.log(parsed.query);
  console.log(
    `\nApplied at the end of the query: ${JSON.stringify(
      parsed.appliedAtEndOfQuery.map((i) => i.item_id)
    )}`
  );
  console.log(
    `Not applied: ${JSON.stringify(
      parsed.notApplied.map(({ item_id: id, code, reason }) => ({ id, code, reason })),
      null,
      2
    )}`
  );
} else if (expectsLog) {
  console.log('\nNo esql_exceptions message in the event log. Check that:');
  console.log(
    "  - xpack.securitySolution.enableExperimental has 'extendedRuleExecutionLoggingEnabled' (restart Kibana)"
  );
  console.log(
    '  - Advanced settings, Security Solution, "Extended rule execution logging: min level" is Info or lower'
  );
} else {
  console.log(
    `\nNo esql_exceptions message, as expected. The query of the rule is the final query:\n\n${query}`
  );
}
