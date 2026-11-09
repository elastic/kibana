/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Creates one ES|QL rule with the exceptions that you describe, and compares what the rule does with what the exceptions model predicts.
//
// An exception item (exception in this script) has `applies_to`:
//   - absent or "source_documents": the item goes to the DSL filter of the request, as for every rule type
//   - "esql_output_columns": the item is applied as one `| WHERE NOT (...)` stage at the end of the rule query. Every entry (item in
//     this script) carries `column_type`. When such an item exists, the executor runs one probe (`<query> | LIMIT 0`) to read the output
//     columns: an entry with an inclusive operator on a column that is not in the output skips the item, one with an exclusive operator is dropped from the stage, and a
//     column whose output type is not the declared `column_type` fails the rule.
// The API rejects some output-column items at creation (400): "is" and "is one of" on double, "matches" on a type that is not keyword or
// text, and a value that does not parse for the declared type.

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

const SOURCE_DOCUMENTS = 'source_documents';
const OUTPUT_COLUMNS = 'esql_output_columns';
// The kind of an item decides applies_to of the exception that holds it. An exception has one applies_to; the items of one
// exception therefore come from the kinds of one group.
const KIND_INFO = {
  source: {
    appliesTo: SOURCE_DOCUMENTS,
    help: 'a field of the source documents',
  },
  computed: {
    appliesTo: OUTPUT_COLUMNS,
    help: 'a column that the query computes (EVAL c = f), declared with its real type',
  },
  redefined: {
    appliesTo: SOURCE_DOCUMENTS,
    help: 'a source field that the query redefines (EVAL f = ...): the DSL compares the SOURCE value',
  },
  missing: {
    appliesTo: SOURCE_DOCUMENTS,
    help: 'a field that exists nowhere: the DSL matches nothing for an inclusive operator, every document for an exclusive one',
  },
  output_redefined: {
    appliesTo: OUTPUT_COLUMNS,
    help: 'the same redefined field as a column of the output: the end of the query compares the computed value',
  },
  output_missing: {
    appliesTo: OUTPUT_COLUMNS,
    help: 'a column that is not in the output: an entry with an inclusive operator skips the item, one with an exclusive operator is dropped',
  },
  wrong_type: {
    appliesTo: OUTPUT_COLUMNS,
    help: 'a computed column whose declared column_type is not the type that the query outputs: the rule fails',
  },
};
const KINDS = Object.keys(KIND_INFO);
const KIND_HELP = 'Kind of item';
const isMissing = (it) => it.kind === 'missing' || it.kind === 'output_missing';
const isRedefined = (it) => it.kind === 'redefined' || it.kind === 'output_redefined';
// A column that the query computes from the source field of the item
const isComputedColumn = (it) => it.kind === 'computed' || it.kind === 'wrong_type';
// A redefined field of a keyword or text type becomes its uppercase value (EVAL f = TO_UPPER(f)); the other types keep their value (EVAL f = f)
const SHOWN_TYPES = ['keyword', 'text'];
const toShown = (value) => String(value).toUpperCase();
// The type that the probe reads for the column of an item that is in the output
const outputTypeOf = (it) => (it.upper ? 'keyword' : it.type);
const IN_DSL_KINDS = ['source', 'redefined'];

// What Elasticsearch does with a value or an operator that the type does not support in the DSL filter.
const WILDCARD_TYPES = ['keyword', 'text', 'version'];
const DSL_FAILS_ON_INVALID = (type) => type !== 'version';
const STRING_TYPES = ['keyword', 'text'];

// What the API refuses when it creates an item that applies to the output columns (every other item is accepted).
const apiRejection = (it) => {
  if (it.appliesTo !== OUTPUT_COLUMNS) return undefined;
  if (it.base === 'matches' && !STRING_TYPES.includes(it.declared))
    return `"matches" is only accepted on keyword and text columns, not on ${it.declared}`;
  if (['is', 'is_one_of'].includes(it.base) && it.declared === 'double')
    return '"is" and "is one of" are not accepted on double columns';
  if (it.invalid)
    return `${JSON.stringify(INVALID_VALUES[it.type])} is not a valid ${it.declared} value`;
  return undefined;
};

const MISMATCH_NEEDLE = 'declare a column type that is not the type that the query outputs';
const PROBE_NEEDLE =
  'The rule did not run because the output columns of its query could not be read to apply its exceptions on them';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => a.slice(2).split('='))
);

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

const FIELD_PREFIX = {
  source: 'f',
  computed: 'c',
  redefined: 'f',
  missing: 'no_such_field_',
  output_redefined: 'f',
  output_missing: 'no_such_field_',
  wrong_type: 'c',
};

let itemCount = 0;
const askItem = async (allowedKinds) => {
  const id = ++itemCount;
  const kind = await choose(`    ${KIND_HELP}`, allowedKinds);
  const type = await choose('    Field type', Object.keys(TYPES));
  // The declared column type of an item that applies to the output columns: the type that the query outputs, except for wrong_type
  const declared =
    kind === 'wrong_type'
      ? await choose(
          '    Column type that the item declares (the query outputs the field type)',
          Object.keys(TYPES).filter((t) => t !== type)
        )
      : kind === 'output_redefined' && SHOWN_TYPES.includes(type)
      ? // the query makes the column with TO_UPPER, which outputs a keyword, and the declared type has to be the output type
        'keyword'
      : type;
  const operator = await choose('    Operator', OPERATORS);
  const base = operator
    .replace(/^is_not/, 'is')
    .replace('does_not_match', 'matches')
    .replace('does_not_exist', 'exists');
  const included =
    !operator.startsWith('is_not') &&
    operator !== 'does_not_match' &&
    operator !== 'does_not_exist';
  const canBeInvalid =
    kind !== 'wrong_type' && INVALID_VALUES[type] !== undefined && ['is', 'is_one_of'].includes(base);
  const invalid =
    canBeInvalid &&
    (await yesNo(
      `    Use a value that is not a ${type} (${JSON.stringify(INVALID_VALUES[type])})`
    ));
  // The values of the item are written for the declared type
  let cfg = invalid
    ? {
        ...TYPES[type],
        value: INVALID_VALUES[type],
        list: [TYPES[type].list[0], INVALID_VALUES[type]],
      }
    : TYPES[declared];
  const redefined = kind === 'redefined' || kind === 'output_redefined';
  if (redefined && SHOWN_TYPES.includes(type) && !invalid) {
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
  const { appliesTo } = KIND_INFO[kind];
  const field = `${FIELD_PREFIX[kind]}${id}`;
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
    declared,
    appliesTo,
    operator,
    base,
    included,
    invalid,
    cfg,
    field,
    entry: appliesTo === OUTPUT_COLUMNS ? { ...entry, column_type: declared } : entry,
    sourceField: `f${id}`,
    upper: redefined && SHOWN_TYPES.includes(type),
  };
};

console.log('Kinds of item. The items of one exception share applies_to:');
for (const [kind, { appliesTo, help }] of Object.entries(KIND_INFO))
  console.log(`  ${kind.padEnd(17)} ${appliesTo.padEnd(18)} ${help}`);

const exceptions = [];
do {
  console.log(`\nException ${exceptions.length + 1}: its items are joined with AND`);
  const items = [];
  do {
    console.log(`  Item ${items.length + 1}`);
    if (items.length)
      console.log(`    (the kinds are limited to the ones that apply to ${items[0].appliesTo})`);
    const allowed = items.length
      ? KINDS.filter((k) => KIND_INFO[k].appliesTo === items[0].appliesTo)
      : KINDS;
    items.push(await askItem(allowed));
  } while (await yesNo(`  Add another item to exception ${exceptions.length + 1}?`));
  exceptions.push({ k: exceptions.length + 1, items, appliesTo: items[0].appliesTo });
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
  const typeNote = it.declared === it.type ? it.type : `${it.type}, declared ${it.declared}`;
  return `${it.field} (${typeNote}, ${it.kind}) ${OPERATOR_LABELS[it.operator]}${value}`;
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
const isExclusive = (it) => !it.included;
const buildDoc = (name, targetEx) => {
  const fields = {};
  for (const ex of exceptions) {
    if (ex === targetEx) {
      for (const it of ex.items) {
        if (isMissing(it)) continue;
        if (it.included) fields[it.sourceField] = TYPES[it.type].docValue;
        else if (it.base !== 'exists') fields[it.sourceField] = TYPES[it.type].other;
      }
    } else if (ex.items.every(isExclusive)) {
      // an absent field satisfies an exclusive operator: give one field the value that the operator excludes
      const breaker = ex.items.find((it) => !isMissing(it));
      if (breaker) fields[breaker.sourceField] = TYPES[breaker.type].docValue;
    }
  }
  return { name, fields };
};
const docs = [
  buildDoc('survivor', undefined),
  ...exceptions.map((ex) => buildDoc(`target-${ex.k}`, ex)),
];

// --suffix=x runs on its own index, list and rule, to let several runs (esql_exceptions_try_matrix.mjs) happen at once
const suffix = args.suffix ? `-${args.suffix}` : '';
const INDEX = `esql_try${suffix.replace('-', '_')}`;
const LIST_ID = `esql-try-list${suffix}`;
const RULE_ID = `esql-try-rule${suffix}`;
const itemIdOf = (ex) => `${LIST_ID}-${ex.k}`;
const nameOf = (ex) => `exception ${ex.k}`;

// An exception is placed whole, in one place, by its applies_to: the DSL filter for source_documents, the end of the query for
// esql_output_columns. The API can refuse an output-column exception when it is created.
const planFor = () => {
  const failures = [];
  const plans = exceptions.map((ex) => {
    const rejection = ex.items.map(apiRejection).find(Boolean);
    if (rejection)
      return {
        status: 'rejected',
        text: `rejected by the API at creation (400): ${rejection}`,
      };
    if (ex.appliesTo === SOURCE_DOCUMENTS) {
      // A "matches" or "exists" entry with an inclusive operator on a field that exists nowhere makes Elasticsearch rewrite the whole item to
      // match nothing before it builds the other entries. A wildcard or a value that it would reject on another entry then does not fail the
      // query. An "is" or "is one of" entry, or an entry with an exclusive operator, does not: the other entry still fails.
      const neverMatches = ex.items.some(
        (it) => it.kind === 'missing' && it.included && ['matches', 'exists'].includes(it.base)
      );
      for (const it of ex.items) {
        if (neverMatches || !IN_DSL_KINDS.includes(it.kind)) continue;
        if (it.base === 'matches' && !WILDCARD_TYPES.includes(it.type))
          failures.push({
            cause: 'elasticsearch',
            text: `Elasticsearch rejects a wildcard query on the ${it.type} field ${it.field}`,
          });
        else if (it.invalid && DSL_FAILS_ON_INVALID(it.type))
          failures.push({
            cause: 'elasticsearch',
            text: `Elasticsearch rejects ${JSON.stringify(INVALID_VALUES[it.type])} on the ${
              it.type
            } field ${it.field}`,
          });
      }
      return {
        status: 'dsl',
        text: 'applies_to source_documents (the default): remains in the DSL filter',
      };
    }
    // applies_to esql_output_columns. The executor first skips an item that has an entry with an inclusive operator on a column that the query does not
    // output, because it can never match. Then it checks the declared type of each entry against the type that the probe reads.
    const absentInclusive = ex.items.find((it) => isMissing(it) && it.included);
    if (absentInclusive)
      return {
        status: 'skipped',
        code: 'field_not_found',
        text: `not applied (field_not_found): "${absentInclusive.field}" is not in the output of the query`,
      };
    const mismatch = ex.items.find(
      (it) => !isMissing(it) && it.declared !== outputTypeOf(it)
    );
    if (mismatch) {
      const message = `The rule did not run because exception items declare a column type that is not the type that the query outputs: "${nameOf(
        ex
      )}" (list "${LIST_ID}", item "${itemIdOf(ex)}") declares the column "${
        mismatch.field
      }" as ${mismatch.declared}, and the query outputs it as ${outputTypeOf(
        mismatch
      )}. Fix the type in these exception items, or remove them from this rule.`;
      failures.push({ cause: 'column_type', text: `Kibana fails the rule before the query runs: ${message}` });
      return { status: 'fails', text: `fails the rule: ${message}` };
    }
    // The entries with an exclusive operator on columns that are not in the output are true for every row and are dropped. When no entry is left, the
    // item is true for every row and excludes all of them (`| WHERE false`), as the DSL filter does for a field that exists nowhere.
    const effective = ex.items.filter((it) => !isMissing(it));
    return {
      status: 'end',
      effective,
      // an item that excludes every row makes the rule show a warning, which is the status "partial failure"
      warns: !effective.length,
      text: !effective.length
        ? 'applies_to esql_output_columns: every entry has an exclusive operator on a column that is not in the output, so the item is true for every row and excludes every row (WHERE false)'
        : `applies_to esql_output_columns: applied at the end of the query${
            effective.length < ex.items.length
              ? ' (the entries with an exclusive operator on columns that are not in the output are dropped)'
              : ''
          }`,
    };
  });
  return { plans, failures };
};

// The value that each engine compares: the DSL filter compares the source document, the end of the query compares the column.
const valueIn = (it, doc, view) => {
  if (isMissing(it)) return undefined;
  const v = doc.fields[it.sourceField];
  if (view === 'dsl') return v;
  return it.upper && v !== undefined ? toShown(v) : v;
};

const outcomes = (plan) =>
  docs.map((d) => {
    const excludedBy = exceptions
      .filter((ex, i) => {
        const p = plan.plans[i];
        if (p.status === 'dsl')
          return ex.items.every((it) => itemMatches(it, valueIn(it, d, 'dsl'), 'dsl'));
        if (p.status === 'end')
          return p.effective.every((it) => itemMatches(it, valueIn(it, d, 'end'), 'end'));
        return false;
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

const plan = planFor();
const allItems = exceptions.flatMap((ex) => ex.items);
const columnItems = allItems.filter(isComputedColumn);
const redefinedItems = allItems.filter(isRedefined);
const query = [
  `FROM ${INDEX} METADATA _id`,
  columnItems.length || redefinedItems.length
    ? `EVAL ${[
        ...columnItems.map((it) => `${it.field} = ${it.sourceField}`),
        ...redefinedItems.map(
          (it) => `${it.field} = ${it.upper ? `TO_UPPER(${it.sourceField})` : it.sourceField}`
        ),
      ].join(', ')}`
    : undefined,
  `KEEP _id, doc${[...columnItems, ...redefinedItems].map((it) => ', ' + it.field).join('')}`,
]
  .filter(Boolean)
  .join(' | ');

await kbn(`/api/detection_engine/rules?rule_id=${RULE_ID}`, 'DELETE');
await kbn(`/api/exception_lists?list_id=${LIST_ID}&namespace_type=single`, 'DELETE');
await es(`/${INDEX}`, 'DELETE');
// deleting a rule leaves its alerts behind, and the alerts of the earlier runs would add up in the Alerts page
await es('/.alerts-security.alerts-*/_delete_by_query?refresh=true&conflicts=proceed', 'POST', {
  query: { term: { 'kibana.alert.rule.rule_id': RULE_ID } },
});
const properties = { '@timestamp': { type: 'date' }, doc: { type: 'keyword' } };
for (const it of allItems) if (!isMissing(it)) properties[it.sourceField] = { type: it.type };
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
// The answer of the API is part of the result: a refusal is expected for some output-column exceptions
for (const ex of exceptions) {
  ex.api = await kbn('/api/exception_lists/items', 'POST', {
    list_id: LIST_ID,
    item_id: itemIdOf(ex),
    name: nameOf(ex),
    description: describeException(ex),
    type: 'simple',
    namespace_type: 'single',
    ...(ex.appliesTo === OUTPUT_COLUMNS ? { applies_to: OUTPUT_COLUMNS } : {}),
    entries: ex.items.map((it) => it.entry),
  });
}
const apiText = (ex) =>
  `${ex.api.status} ${
    typeof ex.api.body === 'string'
      ? ex.api.body
      : ex.api.body?.message ?? JSON.stringify(ex.api.body)
  }`.slice(0, 400);
const creationMismatches = exceptions.flatMap((ex, i) => {
  const rejected = plan.plans[i].status === 'rejected';
  const ok = rejected ? ex.api.status === 400 : ex.api.status < 400;
  return ok
    ? []
    : [
        `exception ${ex.k}: expected ${rejected ? 'a 400' : 'a success'}, the API answered ${apiText(
          ex
        )}`,
      ];
});
const anyCreated = plan.plans.some((p) => p.status !== 'rejected');

console.log(`\nRule query: ${query}`);
console.log(
  '\nExceptions in the list (the items of an exception are joined with AND, the exceptions with OR):'
);
exceptions.forEach((ex, i) => {
  console.log(`  ${ex.k}. ${describeException(ex)}\n     ${plan.plans[i].text}`);
  if (plan.plans[i].status === 'rejected') console.log(`     API answered: ${apiText(ex)}`);
});
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
// The probe runs when at least one output-column exception is in the list; it uses the same filter as the real request
const hasProbe = plan.plans.some((p) => ['end', 'skipped', 'fails'].includes(p.status));
const dslFails = plan.failures.some((f) => f.cause === 'elasticsearch');
const messageNeedle = !plan.failures.length
  ? undefined
  : dslFails && hasProbe
  ? PROBE_NEEDLE
  : dslFails
  ? undefined
  : MISMATCH_NEEDLE;
console.log('\nWhat to expect:');
for (const [i, ex] of exceptions.entries())
  if (plan.plans[i].status === 'rejected')
    console.log(`  API: exception ${ex.k} is rejected with a 400 at creation`);
if (!anyCreated) {
  console.log('  Every exception is rejected by the API. No rule is created.');
} else if (plan.failures.length) {
  console.log(
    `  The rule fails and creates no alerts. ${[...new Set(plan.failures.map((f) => f.text))].join(
      '; '
    )}${
      dslFails && hasProbe
        ? `. The probe query fails with the same filter. The message of the rule is then: ${PROBE_NEEDLE}: <reason>`
        : ''
    }`
  );
} else {
  console.log(`  Alerts for: ${expectedAlerts.join(', ') || '(none)'}`);
}
const expectsLog = anyCreated && !plan.failures.length && plan.plans.some((p) => ['end', 'skipped'].includes(p.status));
const expectedApplied = exceptions
  .filter((ex, i) => plan.plans[i].status === 'end')
  .map(itemIdOf)
  .sort();
const expectedNotApplied = exceptions
  .flatMap((ex, i) =>
    plan.plans[i].status === 'skipped' ? [`${itemIdOf(ex)}:${plan.plans[i].code}`] : []
  )
  .sort();
if (anyCreated)
  console.log(
    expectsLog
      ? '  The execution log should have an esql_exceptions message with the final query.'
      : '  No esql_exceptions message: every exception remains in the DSL filter or was rejected, or the rule fails first.'
  );

const sameList = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const runAndCheck = async () => {
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
  const parsed = entryLog ? JSON.parse(entryLog) : undefined;
  const sameAlerts = JSON.stringify(alerted) === JSON.stringify([...expectedAlerts].sort());
  const expectsWarning = plan.plans.some((p) => p.warns);
  const statusOk = plan.failures.length
    ? last?.status === 'failed'
    : last?.status === (expectsWarning ? 'partial failure' : 'succeeded');
  const messageOk = !messageNeedle || (last?.message ?? '').includes(messageNeedle);
  // The log is compared when it is there; its absence is reported below, as before
  const logOk =
    !parsed ||
    (sameList(parsed.appliedAtEndOfQuery.map((i) => i.item_id).sort(), expectedApplied) &&
      sameList(parsed.notApplied.map((i) => `${i.item_id}:${i.code}`).sort(), expectedNotApplied));
  const allOk = sameAlerts && statusOk && messageOk && logOk;
  if (!messageOk) console.log(`The message of the rule does not contain: ${messageNeedle}`);
  if (!logOk)
    console.log(
      `The esql_exceptions message differs: expected applied ${JSON.stringify(
        expectedApplied
      )} and not applied ${JSON.stringify(expectedNotApplied)}`
    );
  console.log(allOk ? 'This matches what to expect.' : 'This DIFFERS from what to expect.');
  if (!allOk) process.exitCode = 2;

  if (parsed) {
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
};

if (creationMismatches.length) {
  console.log('\nResult: the API did not answer as expected');
  creationMismatches.forEach((line) => console.log(`  ${line}`));
  console.log('This DIFFERS from what to expect.');
  process.exitCode = 2;
} else if (!anyCreated) {
  console.log('\nResult: the API rejected every exception, as expected');
  console.log('This matches what to expect.');
} else {
  await runAndCheck();
}
