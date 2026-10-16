/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const KBN = process.env.KBN_URL || 'http://localhost:5601/kbn';
const ES = process.env.ES_URL || 'http://localhost:9200';
const auth =
  'Basic ' +
  Buffer.from(`${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`).toString(
    'base64'
  );
const send = async (base, path, method, body, extra = {}, ndjson) => {
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
  return { status: res.status, body: text ? JSON.parse(text) : null };
};
const es = (p, m = 'GET', b, nd) => send(ES, p, m, b, {}, nd);
const kbn = (p, m = 'GET', b, extra) => send(KBN, p, m, b, extra);
const must = (label, r) => {
  if (r.status >= 400)
    throw new Error(`${label}: ${r.status} ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body;
};

const INDEX = 'smoke_exc';
const RULE_ID = 'esql-smoke-rule';
const LISTS = {
  source: 'esql-smoke-source',
  computed: 'esql-smoke-computed',
  negative: 'esql-smoke-negative',
};
const VALUE_LIST = 'esql-smoke-hosts';

const properties = {
  '@timestamp': { type: 'date' },
  doc: { type: 'keyword' },
  keyword_f: { type: 'keyword' },
  text_f: { type: 'text' },
  match_only_text_f: { type: 'match_only_text' },
  wildcard_f: { type: 'wildcard' },
  constant_keyword_f: { type: 'constant_keyword', value: 'const' },
  search_as_you_type_f: { type: 'search_as_you_type' },
  completion_f: { type: 'completion' },
  token_count_f: { type: 'token_count', analyzer: 'standard' },
  long_f: { type: 'long' },
  integer_f: { type: 'integer' },
  short_f: { type: 'short' },
  byte_f: { type: 'byte' },
  unsigned_long_f: { type: 'unsigned_long' },
  double_f: { type: 'double' },
  float_f: { type: 'float' },
  half_float_f: { type: 'half_float' },
  scaled_float_f: { type: 'scaled_float', scaling_factor: 100 },
  boolean_f: { type: 'boolean' },
  ip_f: { type: 'ip' },
  version_f: { type: 'version' },
  date_f: { type: 'date' },
  date_nanos_f: { type: 'date_nanos' },
  geo_point_f: { type: 'geo_point' },
  geo_shape_f: { type: 'geo_shape' },
  point_f: { type: 'point' },
  shape_f: { type: 'shape' },
  ip_range_f: { type: 'ip_range' },
  long_range_f: { type: 'long_range' },
  double_range_f: { type: 'double_range' },
  date_range_f: { type: 'date_range' },
  flattened_f: { type: 'flattened' },
  nested_f: {
    type: 'nested',
    properties: { name: { type: 'keyword' }, role: { type: 'keyword' } },
  },
  object_f: { properties: { name: { type: 'keyword' } } },
  binary_f: { type: 'binary' },
  histogram_f: { type: 'histogram' },
  aggregate_metric_f: {
    type: 'aggregate_metric_double',
    metrics: ['min', 'max', 'sum', 'value_count'],
    default_metric: 'max',
  },
  dense_vector_f: { type: 'dense_vector', dims: 3 },
  sparse_vector_f: { type: 'sparse_vector' },
  rank_feature_f: { type: 'rank_feature' },
  percolator_f: { type: 'percolator' },
  join_f: { type: 'join', relations: { question: 'answer' } },
  alias_f: { type: 'alias', path: 'keyword_f' },
  tags: { type: 'keyword' },
  optional_f: { type: 'keyword' },
  optional2_f: { type: 'keyword' },
  dropped_f: { type: 'keyword' },
};

const base = () => ({
  '@timestamp': new Date().toISOString(),
  keyword_f: 'kw-keep',
  text_f: 'regular message',
  match_only_text_f: 'plain text',
  wildcard_f: 'wild',
  search_as_you_type_f: 'quick brown fox',
  completion_f: 'comp',
  token_count_f: 'one two three',
  long_f: 1,
  integer_f: 1,
  short_f: 1,
  byte_f: 1,
  unsigned_long_f: '1',
  double_f: 1.5,
  float_f: 1.5,
  half_float_f: 1.5,
  scaled_float_f: 1.5,
  boolean_f: false,
  ip_f: '192.168.0.1',
  version_f: '0.0.1',
  date_f: '2026-01-01T00:00:00Z',
  date_nanos_f: '2026-01-01T00:00:00.123456789Z',
  geo_point_f: '10,10',
  geo_shape_f: { type: 'Point', coordinates: [10, 10] },
  point_f: '1.0,2.0',
  shape_f: 'POINT (1 2)',
  ip_range_f: '192.168.0.0/24',
  long_range_f: { gte: 1, lte: 2 },
  double_range_f: { gte: 1.5, lte: 2.5 },
  date_range_f: { gte: '2026-01-01', lte: '2026-02-01' },
  flattened_f: { team: 'blue' },
  nested_f: [{ name: 'a', role: 'b' }],
  object_f: { name: 'obj' },
  binary_f: 'aGVsbG8=',
  histogram_f: { values: [0.1, 0.2], counts: [3, 7] },
  aggregate_metric_f: { min: 1, max: 2, sum: 3, value_count: 2 },
  dense_vector_f: [0.1, 0.2, 0.3],
  sparse_vector_f: { token: 1.2 },
  rank_feature_f: 1,
  percolator_f: { match_all: {} },
  join_f: 'question',
  tags: ['t1', 't2'],
  dropped_f: 'd',
});

const docs = [
  { doc: 'control' },
  { doc: 'src-keyword-is', keyword_f: 'kw-a' },
  { doc: 'src-keyword-any', keyword_f: 'kw-c' },
  { doc: 'src-text-wildcard', text_f: 'a friendly ghost appears' },
  { doc: 'src-long', long_f: 42 },
  { doc: 'src-ip', ip_f: '10.0.0.1' },
  { doc: 'src-flattened-key', flattened_f: { team: 'red' } },
  { doc: 'src-nested', nested_f: [{ name: 'svc', role: 'admin' }] },
  {
    doc: 'src-nested-split',
    nested_f: [
      { name: 'svc', role: 'user' },
      { name: 'bob', role: 'admin' },
    ],
  },
  { doc: 'src-date-day', date_f: '2026-09-30T14:00:00Z' },
  { doc: 'src-exists', optional_f: 'present' },
  { doc: 'src-value-list', keyword_f: 'listed-1' },
  { doc: 'c-tier-gold', long_f: 1000 },
  { doc: 'c-keyword-wildcard', keyword_f: 'kw-zeta' },
  { doc: 'c-long-any', long_f: 200 },
  { doc: 'c-integer', integer_f: 7 },
  { doc: 'c-unsigned-long', unsigned_long_f: '18446744073709551615' },
  { doc: 'c-double', double_f: 3.14 },
  { doc: 'c-boolean', boolean_f: true },
  { doc: 'c-ip', ip_f: '10.0.0.9' },
  { doc: 'c-version', version_f: '1.2.3' },
  { doc: 'c-date-day', date_f: '2026-10-01T08:00:00Z' },
  { doc: 'c-date-nanos-day', date_nanos_f: '2026-10-01T08:00:00.5Z' },
  { doc: 'c-text-phrase', text_f: 'Connection to Good.com failed' },
  { doc: 'c-text-wildcard-not-applied', text_f: 'good.com' },
  { doc: 'c-geo-not-applied', geo_point_f: '41.12,-71.34' },
  { doc: 'c-multi-valued', tags: ['x', 'y'] },
  { doc: 'c-exists', optional2_f: 'present' },
  { doc: 'c-and-two-entries', integer_f: 11 },
  { doc: 'c-bad-value-not-applied', integer_f: 5 },
].map((d) => ({ ...base(), ...d }));

const e = (type, field, value, operator = 'included') =>
  type === 'exists' ? { field, operator, type } : { field, operator, type, value };

const items = [
  [LISTS.source, 'keyword is kw-a', [e('match', 'keyword_f', 'kw-a')]],
  [LISTS.source, 'keyword is one of kw-b, kw-c', [e('match_any', 'keyword_f', ['kw-b', 'kw-c'])]],
  [LISTS.source, 'text matches *ghost*', [e('wildcard', 'text_f', '*ghost*')]],
  [LISTS.source, 'long is 42', [e('match', 'long_f', '42')]],
  [LISTS.source, 'ip is 10.0.0.1', [e('match', 'ip_f', '10.0.0.1')]],
  [LISTS.source, 'flattened key team is red', [e('match', 'flattened_f.team', 'red')]],
  [
    LISTS.source,
    'nested name svc and role admin',
    [
      {
        field: 'nested_f',
        type: 'nested',
        entries: [e('match', 'name', 'svc'), e('match', 'role', 'admin')],
      },
    ],
  ],
  [LISTS.source, 'date is the day 2026-09-30', [e('match', 'date_f', '2026-09-30')]],
  [LISTS.source, 'optional_f exists', [e('exists', 'optional_f')]],
  [
    LISTS.source,
    'keyword is in value list',
    [
      {
        field: 'keyword_f',
        operator: 'included',
        type: 'list',
        list: { id: VALUE_LIST, type: 'keyword' },
      },
    ],
  ],
  [LISTS.computed, 'c_tier is gold', [e('match', 'c_tier', 'gold')]],
  [LISTS.computed, 'c_keyword matches kw-z*', [e('wildcard', 'c_keyword', 'kw-z*')]],
  [LISTS.computed, 'c_long is one of 100, 200', [e('match_any', 'c_long', ['100', '200'])]],
  [LISTS.computed, 'c_int is 7', [e('match', 'c_int', '7')]],
  [LISTS.computed, 'c_ulong is 2^64-1', [e('match', 'c_ulong', '18446744073709551615')]],
  [LISTS.computed, 'c_double is 3.14', [e('match', 'c_double', '3.14')]],
  [LISTS.computed, 'c_bool is true', [e('match', 'c_bool', 'true')]],
  [LISTS.computed, 'c_ip is 10.0.0.9', [e('match', 'c_ip', '10.0.0.9')]],
  [LISTS.computed, 'c_version is 1.2.3', [e('match', 'c_version', '1.2.3')]],
  [LISTS.computed, 'c_date is the day 2026-10-01', [e('match', 'c_date', '2026-10-01')]],
  [
    LISTS.computed,
    'c_date_nanos is the day 2026-10-01',
    [e('match', 'c_date_nanos', '2026-10-01')],
  ],
  [LISTS.computed, 'c_text is "to good.com" (phrase)', [e('match', 'c_text', 'to good.com')]],
  [LISTS.computed, 'c_text matches good* (not applied)', [e('wildcard', 'c_text', 'good*')]],
  [LISTS.computed, 'c_geo is a point (not applied)', [e('match', 'c_geo', '41.12,-71.34')]],
  [LISTS.computed, 'c_tags is x (multi-valued)', [e('match', 'c_tags', 'x')]],
  [LISTS.computed, 'c_opt exists', [e('exists', 'c_opt')]],
  [
    LISTS.computed,
    'c_tier is silver and c_int is 11',
    [e('match', 'c_tier', 'silver'), e('match', 'c_int', '11')],
  ],
  [LISTS.computed, 'c_int is abc (not applied, bad value)', [e('match', 'c_int', 'abc')]],
  [LISTS.computed, 'c_long matches 4* (not applied)', [e('wildcard', 'c_long', '4*')]],
  [LISTS.computed, 'ghost.field is not x, a field that exists nowhere (stays in the DSL filter and excludes every document)', [e('match', 'ghost.field', 'x', 'excluded')]],
  [LISTS.computed, 'dropped_f and c_tier (debug)', [e('match', 'dropped_f', 'd'), e('match', 'c_tier', 'gold')]],
  [LISTS.negative, 'c_keyword is not kw-keep', [e('match', 'c_keyword', 'kw-keep', 'excluded')]],
  [LISTS.negative, 'c_ip does not exist', [e('exists', 'c_ip', undefined, 'excluded')]],
];

const query = `FROM ${INDEX} METADATA _id
| EVAL c_keyword = keyword_f, c_text = text_f, c_long = long_f, c_int = integer_f, c_ulong = unsigned_long_f, c_double = double_f, c_bool = boolean_f, c_ip = ip_f, c_version = version_f, c_date = date_f, c_date_nanos = date_nanos_f, c_geo = geo_point_f, c_tags = tags, c_opt = optional2_f, c_tier = CASE(long_f >= 1000, "gold", "silver")
| KEEP _id, doc, c_*`;

const main = async () => {
  await kbn(`/api/detection_engine/rules?rule_id=${RULE_ID}`, 'DELETE');
  for (const list of Object.values(LISTS))
    await kbn(`/api/exception_lists?list_id=${list}&namespace_type=single`, 'DELETE');
  await kbn(`/api/lists?id=${VALUE_LIST}`, 'DELETE');
  await es(`/${INDEX}`, 'DELETE');

  must('create index', await es(`/${INDEX}`, 'PUT', { mappings: { properties } }));
  const bulk =
    docs.flatMap((d) => [JSON.stringify({ index: {} }), JSON.stringify(d)]).join('\n') + '\n';
  const bulkRes = must('bulk', await es(`/${INDEX}/_bulk?refresh=true`, 'POST', bulk, true));
  if (bulkRes.errors)
    throw new Error('bulk: ' + JSON.stringify(bulkRes.items.find((i) => i.index.error)));

  await kbn('/api/lists/index', 'POST');
  must(
    'value list',
    await kbn('/api/lists', 'POST', {
      id: VALUE_LIST,
      name: VALUE_LIST,
      description: 'smoke',
      type: 'keyword',
    })
  );
  for (const value of ['listed-1', 'listed-2'])
    must('value list item', await kbn('/api/lists/items', 'POST', { list_id: VALUE_LIST, value }));

  const created = {};
  for (const list of Object.values(LISTS)) {
    created[list] = must(
      'exception list',
      await kbn('/api/exception_lists', 'POST', {
        list_id: list,
        name: list,
        description: 'smoke',
        type: 'detection',
        namespace_type: 'single',
      })
    );
  }
  let n = 0;
  for (const [list_id, name, entries] of items) {
    must(
      `item ${name}`,
      await kbn('/api/exception_lists/items', 'POST', {
        list_id,
        item_id: `${list_id}-${++n}`,
        name,
        description: name,
        type: 'simple',
        namespace_type: 'single',
        entries,
      })
    );
  }

  const rule = must(
    'rule',
    await kbn('/api/detection_engine/rules', 'POST', {
      rule_id: RULE_ID,
      name: 'ES|QL exceptions smoke',
      description: 'smoke',
      type: 'esql',
      language: 'esql',
      query,
      risk_score: 21,
      severity: 'low',
      from: 'now-1h',
      interval: '5m',
      enabled: true,
      exceptions_list: [LISTS.source, LISTS.computed].map((l) => ({
        id: created[l].id,
        list_id: l,
        type: 'detection',
        namespace_type: 'single',
      })),
    })
  );
  await kbn(`/internal/alerting/rule/${rule.id}/_run_soon`, 'POST', undefined, {
    'x-elastic-internal-origin': 'kibana',
    'elastic-api-version': '1',
  });

  console.log(`index ${INDEX}: ${docs.length} documents`);
  console.log(
    `exception items: ${items.length} in ${Object.values(LISTS).join(', ')} (${
      LISTS.negative
    } is not attached to the rule)`
  );
  console.log(`rule ${rule.id} created and run`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
