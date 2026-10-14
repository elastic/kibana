/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Differential test: the DSL filter of an exception against the same exception written as a `WHERE` right after
// `FROM`, for every field type and every operator that works in the DSL. Two inlined forms are compared: the direct
// translation (`==`, `IN`, `LIKE`, `IS NOT NULL`) and the output of the production compiler.
// Run: OUT=<dir> node scripts/jest <this file>. Needs Elasticsearch at ES_URL (default http://localhost:9200).

import { writeFileSync } from 'fs';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { compileEndStageItem } from './build_end_stage_clause';

jest.setTimeout(3_000_000);

const ES = process.env.ES_URL || 'http://localhost:9200';
const AUTH = `Basic ${Buffer.from(
  `${process.env.ES_USER || 'elastic'}:${process.env.ES_PASS || 'changeme'}`
).toString('base64')}`;
const HEADERS = { Authorization: AUTH, 'Content-Type': 'application/json' };
const OUT = process.env.OUT as string;

const call = async (path: string, method: string, body?: unknown) =>
  (
    await fetch(ES + path, {
      method,
      headers: HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  ).json() as Promise<any>;

interface Doc {
  id: string;
  src: Record<string, unknown>;
}
type Dir = Record<string, unknown>;
interface TypeDef {
  name: string;
  settings?: Dir;
  mappings: Dir;
  docs: Doc[];
  /** the field the operators are applied to */
  field: string;
  is?: string[];
  oneOf?: string[][];
  matches?: string[];
  exists?: boolean;
  lists?: Array<{ listType: 'keyword' | 'ip' | 'ip_range'; values: string[] }>;
  nested?: boolean;
}

const f = (id: string, value: unknown): Doc => ({
  id,
  src: value === undefined ? {} : { f: value },
});
const docsOf = (prefix: string, values: unknown[]): Doc[] =>
  values.map((v, i) => f(`${prefix}${i + 1}`, v));
const NUM_MATCHES = ['4*'];
const ISO = (extra: string[] = []) => [
  '2026',
  '2026-10',
  '2026-10-01',
  '2026-10-01T08',
  '2026-10-01T08:00',
  '2026-10-01T08:00:00Z',
  '2026-10-01T08:00:00.000Z',
  '2026-10-01T10:00:00+02:00',
  '1759305600000',
  '2026-13-01',
  '2026-10-01Z',
  ...extra,
];

const TYPES: TypeDef[] = [
  {
    name: 'keyword',
    field: 'f',
    mappings: { f: { type: 'keyword' } },
    docs: docsOf('k', [
      'good.com',
      'Good.COM',
      ' good.com',
      'good.com ',
      'bad.com',
      '',
      'a\\b',
      'line1\nline2',
      'wild*card',
      'über',
      ['good.com', 'bad.com'],
      undefined,
      null,
      'x"y',
    ]),
    is: [
      'good.com',
      'GOOD.COM',
      '',
      'a\\b',
      'line1\nline2',
      'wild*card',
      'über',
      'good.com ',
      'x"y',
    ],
    oneOf: [['good.com', 'bad.com'], ['GOOD.COM', 'missing'], ['a\\b', 'über'], ['good.com']],
    matches: [
      'good*',
      '*good*',
      'g?od.com',
      'GOOD*',
      '*',
      'good.com',
      '*.com',
      'wild\\*card',
      'a\\\\b',
      'a\\b',
      '???',
      '*\n*',
    ],
    exists: true,
    lists: [
      { listType: 'keyword', values: ['good.com', 'bad.com'] },
      { listType: 'keyword', values: ['GOOD.COM', 'über', ''] },
    ],
  },
  {
    name: 'keyword_normalizer',
    field: 'f',
    settings: { analysis: { normalizer: { lc: { type: 'custom', filter: ['lowercase'] } } } },
    mappings: { f: { type: 'keyword', normalizer: 'lc' } },
    docs: docsOf('n', ['ABC', 'abc', 'Abc', ['ABC', 'x'], undefined, 'XYZ']),
    is: ['ABC', 'abc', 'Abc', 'XYZ'],
    oneOf: [['ABC', 'q'], ['abc']],
    matches: ['AB*', 'ab*', 'xyz'],
    exists: true,
  },
  {
    name: 'keyword_ignore_above',
    field: 'f',
    mappings: { f: { type: 'keyword', ignore_above: 10 } },
    docs: docsOf('i', ['short', 'x'.repeat(30), undefined, ['short', 'x'.repeat(30)]]),
    is: ['short', 'x'.repeat(30)],
    oneOf: [['short', 'x'.repeat(30)]],
    matches: ['x*', 's*'],
    exists: true,
  },
  {
    name: 'text',
    field: 'f',
    mappings: { f: { type: 'text' } },
    docs: docsOf('t', [
      'Connection to good.com failed',
      'GOOD morning',
      'Good.com',
      'two  spaces',
      'good-day',
      ['to good.com', 'other'],
      undefined,
      '',
      'Failed login',
    ]),
    is: [
      'good.com',
      'to good.com',
      'Connection',
      'connection to',
      'good',
      'failed to',
      'Good',
      'two spaces',
      'good day',
      'Connection to good.com failed',
    ],
    oneOf: [['good.com', 'morning'], ['GOOD', 'missing'], ['failed login']],
    matches: [
      'good*',
      '*good*',
      'GOOD*',
      'conn*',
      '*om*',
      '?ood*',
      'good.com',
      'Connection*',
      'to good*',
    ],
    exists: true,
  },
  {
    name: 'match_only_text',
    field: 'f',
    mappings: { f: { type: 'match_only_text' } },
    docs: docsOf('m', [
      'Connection to good.com failed',
      'GOOD morning',
      undefined,
      ['to good.com', 'other'],
    ]),
    is: ['good.com', 'to good.com', 'Good'],
    oneOf: [['good.com', 'morning']],
    matches: ['good*', 'GOOD*'],
    exists: true,
  },
  {
    name: 'wildcard',
    field: 'f',
    mappings: { f: { type: 'wildcard' } },
    docs: docsOf('w', [
      'good.com',
      'Good.COM',
      'a\\b',
      'line1\nline2',
      undefined,
      ['good.com', 'bad.com'],
      'x'.repeat(300),
    ]),
    is: ['good.com', 'GOOD.COM', 'a\\b', 'line1\nline2', 'x'.repeat(300)],
    oneOf: [['good.com', 'bad.com']],
    matches: ['good*', '*good*', 'GOOD*', 'g?od.com', '*', 'a\\\\b', '*\n*', 'x*'],
    exists: true,
  },
  {
    name: 'constant_keyword',
    field: 'f',
    mappings: { f: { type: 'constant_keyword', value: 'prod' } },
    docs: [
      { id: 'c1', src: { f: 'prod' } },
      { id: 'c2', src: {} },
    ],
    is: ['prod', 'dev', 'PROD'],
    oneOf: [['prod', 'dev']],
    matches: ['pr*', 'dev*'],
    exists: true,
  },
  {
    name: 'integer',
    field: 'f',
    mappings: { f: { type: 'integer' } },
    docs: docsOf('x', [42, -7, 0, 2147483647, [42, 7], undefined, null, 43]),
    is: [
      '42',
      '042',
      '+42',
      '42.0',
      '4.2e1',
      '-7',
      '0',
      'abc',
      '',
      '2147483648',
      '1e3',
      '42.5',
      ' 42',
    ],
    oneOf: [['42', '7'], ['abc'], ['42', '0x10'], ['43', '-7']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'long',
    field: 'f',
    mappings: { f: { type: 'long' } },
    docs: docsOf('l', [
      42,
      9000000000,
      -9000000000,
      '9007199254740993',
      [1, 9000000000],
      undefined,
      '9223372036854775807',
    ]),
    is: [
      '42',
      '9000000000',
      '9007199254740993',
      '9007199254740992',
      '42.0',
      '1e3',
      'abc',
      '9223372036854775807',
      '9223372036854775808',
      '-9000000000',
    ],
    oneOf: [
      ['42', '9000000000'],
      ['9007199254740993', '1'],
    ],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'short',
    field: 'f',
    mappings: { f: { type: 'short' } },
    docs: docsOf('s', [42, 32767, -32768, undefined, [1, 42]]),
    is: ['42', '32767', '32768', '-32768'],
    oneOf: [['42', '1']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'byte',
    field: 'f',
    mappings: { f: { type: 'byte' } },
    docs: docsOf('b', [42, 127, -128, undefined, [1, 42]]),
    is: ['42', '127', '128', '-128'],
    oneOf: [['42', '1']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'double',
    field: 'f',
    mappings: { f: { type: 'double' } },
    docs: docsOf('d', [0.1, 3.14, 1e10, -0.5, [0.1, 0.2], 0, undefined, 0.30000000000000004, 1.5]),
    is: [
      '0.1',
      '0.10',
      '1e-1',
      '3.14',
      '.5',
      '-0.5',
      '0',
      '1e10',
      'NaN',
      'Infinity',
      'abc',
      '0.30000000000000004',
      '0.3',
      '1.5',
    ],
    oneOf: [
      ['0.1', '3.14'],
      ['0.3', '1.5'],
    ],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'float',
    field: 'f',
    mappings: { f: { type: 'float' } },
    docs: docsOf('fl', [0.1, 3.14, 1.5, 0.3, -0.5, [0.1, 0.2], undefined, 16777217]),
    is: [
      '0.1',
      '3.14',
      '1.5',
      '0.3',
      '0.30000001192092896',
      '0.10000000149011612',
      '16777216',
      '16777217',
    ],
    oneOf: [['0.1', '1.5'], ['0.3']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'half_float',
    field: 'f',
    mappings: { f: { type: 'half_float' } },
    docs: docsOf('hf', [0.1, 1.5, 65504, undefined, [0.1, 1.5]]),
    is: ['0.1', '1.5', '0.0999755859375', '65504'],
    oneOf: [['0.1', '1.5']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'scaled_float',
    field: 'f',
    mappings: { f: { type: 'scaled_float', scaling_factor: 100 } },
    docs: docsOf('sf', [0.1, 3.14, 3.145, 1.005, undefined, [0.1, 3.14]]),
    is: ['0.1', '3.14', '3.15', '3.145', '1.01', '1.005'],
    oneOf: [['0.1', '3.14']],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'unsigned_long',
    field: 'f',
    mappings: { f: { type: 'unsigned_long' } },
    docs: docsOf('u', [
      '18446744073709551615',
      '0',
      '5',
      ['5', '7'],
      undefined,
      '9223372036854775808',
    ]),
    is: [
      '18446744073709551615',
      '5',
      '0',
      '-1',
      '5.0',
      '18446744073709551616',
      'abc',
      '9223372036854775808',
    ],
    oneOf: [
      ['5', '7'],
      ['18446744073709551615', '1'],
    ],
    matches: NUM_MATCHES,
    exists: true,
  },
  {
    name: 'boolean',
    field: 'f',
    mappings: { f: { type: 'boolean' } },
    docs: docsOf('bo', [true, false, 'true', 'false', '', [true, false], undefined]),
    is: ['true', 'false', 'TRUE', '1', 'yes', ''],
    oneOf: [['true'], ['true', 'false'], ['false', 'x']],
    matches: ['t*'],
    exists: true,
  },
  {
    name: 'ip',
    field: 'f',
    mappings: { f: { type: 'ip' } },
    docs: docsOf('ip', [
      '10.0.0.5',
      '192.168.0.1',
      '::1',
      '2001:db8::1',
      '::ffff:1.2.3.4',
      ['1.1.1.1', '10.0.0.7'],
      undefined,
      '10.0.1.9',
      '0.0.0.0',
    ]),
    is: [
      '10.0.0.5',
      '10.0.0.0/24',
      '10.0.0.5/32',
      '::1',
      '::1/128',
      '2001:db8::/32',
      '::ffff:1.2.3.4',
      '1.2.3.4',
      '10.0.0.0/33',
      'bogus',
      '0.0.0.0/0',
      '::/0',
      '::ffff:0:0/96',
      '010.0.0.5',
      '1.2.3.4/+8',
      'fe80::1%eth0',
    ],
    oneOf: [
      ['10.0.0.5', '192.168.0.0/16'],
      ['1.1.1.1', 'bogus'],
      ['10.0.0.0/24', '2001:db8::/32'],
    ],
    matches: ['10.*'],
    exists: true,
    lists: [
      { listType: 'ip', values: ['10.0.0.5', '192.168.0.1'] },
      { listType: 'ip', values: ['10.0.0.0/24', '::1'] },
      { listType: 'ip_range', values: ['10.0.0.1-10.0.0.9', '192.168.0.0/16'] },
    ],
  },
  {
    name: 'version',
    field: 'f',
    mappings: { f: { type: 'version' } },
    docs: docsOf('v', [
      '1.2.3',
      '1.2.3-beta',
      '2.0.0',
      '10.0.0',
      '1.10.0',
      ['1.2.3', '2.0.0'],
      undefined,
      '1.2',
    ]),
    is: [
      '1.2.3',
      '1.2',
      '1.2.3-beta',
      'bogus',
      '10.0.0',
      '1.10.0',
      '1.02.3',
      '2',
      '99999999999999999999.1.1',
    ],
    oneOf: [['1.2.3', '2.0.0'], ['bogus']],
    matches: ['1.*', '*.3', '1.2.*', '1.2.3*'],
    exists: true,
  },
  {
    name: 'date',
    field: 'f',
    mappings: { f: { type: 'date' } },
    docs: docsOf('dt', [
      '2026-10-01T08:00:00Z',
      '2026-10-01T23:59:59.999Z',
      '2026-10-02T00:00:00Z',
      '2026-09-30T12:00:00Z',
      1759305600000,
      ['2026-10-01T08:00:00Z', '2026-01-15T00:00:00Z'],
      '2026-01-01T00:00:00Z',
      undefined,
      '2026-10-01T08:00:00.123Z',
    ]),
    is: ISO(['2026-10-01T08:00:00.123Z']),
    oneOf: [
      ['2026-10-01', '2026-09-30'],
      ['2026-10', 'bogus'],
    ],
    matches: ['2026*'],
    exists: true,
  },
  {
    name: 'date_nanos',
    field: 'f',
    mappings: { f: { type: 'date_nanos' } },
    docs: docsOf('dn', [
      '2026-10-01T08:00:00.123456789Z',
      '2026-10-01T08:00:00Z',
      '2026-10-01T23:59:59.999999999Z',
      '2026-10-02T00:00:00Z',
      undefined,
      ['2026-10-01T08:00:00Z', '2026-01-15T00:00:00Z'],
      '2026-10-01T08:00:00.123Z',
    ]),
    is: ISO(['2026-10-01T08:00:00.123456789Z', '2026-10-01T08:00:00.123Z']),
    oneOf: [['2026-10-01', '2026-09-30']],
    matches: ['2026*'],
    exists: true,
  },
  {
    name: 'ip_range',
    field: 'f',
    mappings: { f: { type: 'ip_range' } },
    docs: docsOf('ir', [
      { gte: '10.0.0.0', lte: '10.0.0.255' },
      { gte: '192.168.0.0', lte: '192.168.255.255' },
      undefined,
      '10.0.0.0/24',
    ]),
    is: ['10.0.0.5', '10.0.0.0/24', '192.168.1.1'],
    oneOf: [['10.0.0.5', '1.1.1.1']],
    exists: true,
  },
  {
    name: 'geo_point',
    field: 'f',
    mappings: { f: { type: 'geo_point' } },
    docs: docsOf('g', ['41.12,-71.34', undefined, [-71.34, 41.12]]),
    is: ['41.12,-71.34'],
    exists: true,
  },
  {
    name: 'flattened_subkey',
    field: 'labels.domain',
    mappings: { labels: { type: 'flattened' } },
    docs: [
      { id: 'fl1', src: { labels: { domain: 'evil.com', owner: 'a' } } },
      { id: 'fl2', src: { labels: { domain: 'good.com' } } },
      { id: 'fl3', src: { labels: { domain: ['evil.com', 'x'] } } },
      { id: 'fl4', src: { labels: { owner: 'b' } } },
      { id: 'fl5', src: {} },
    ],
    is: ['evil.com', 'EVIL.COM', 'good.com'],
    oneOf: [['evil.com', 'x']],
    matches: ['evil*', '*.com'],
    exists: true,
  },
  {
    name: 'flattened_root',
    field: 'labels',
    mappings: { labels: { type: 'flattened' } },
    docs: [
      { id: 'fr1', src: { labels: { domain: 'evil.com' } } },
      { id: 'fr2', src: {} },
    ],
    is: ['evil.com'],
    exists: true,
  },
  {
    name: 'object_parent',
    field: 'host',
    mappings: { host: { properties: { name: { type: 'keyword' } } } },
    docs: [
      { id: 'o1', src: { host: { name: 'a' } } },
      { id: 'o2', src: { host: {} } },
      { id: 'o3', src: {} },
    ],
    exists: true,
  },
  {
    name: 'alias_of_keyword',
    field: 'f',
    mappings: { real: { type: 'keyword' }, f: { type: 'alias', path: 'real' } },
    docs: [
      { id: 'a1', src: { real: 'good.com' } },
      { id: 'a2', src: { real: 'bad.com' } },
      { id: 'a3', src: {} },
      { id: 'a4', src: { real: ['good.com', 'bad.com'] } },
    ],
    is: ['good.com', 'GOOD.COM'],
    oneOf: [['good.com', 'x']],
    matches: ['good*'],
    exists: true,
  },
  {
    name: 'nested',
    field: 'nested_user',
    mappings: {
      nested_user: {
        type: 'nested',
        properties: { name: { type: 'keyword' }, age: { type: 'long' } },
      },
    },
    docs: [
      {
        id: 'ne1',
        src: {
          nested_user: [
            { name: 'svc', age: 3 },
            { name: 'bob', age: 40 },
          ],
        },
      },
      { id: 'ne2', src: { nested_user: [{ name: 'bob', age: 3 }] } },
      { id: 'ne3', src: { nested_user: [{ name: 'svc' }] } },
      { id: 'ne4', src: {} },
    ],
    nested: true,
  },
];

// ---- DSL clauses, in the shapes that build_exception_filter.ts produces ----
const matchPhrase = (field: string, value: string) => ({
  bool: { minimum_should_match: 1, should: [{ match_phrase: { [field]: value } }] },
});
const baseClause = (op: string, field: string, v: unknown): Dir => {
  switch (op) {
    case 'is':
      return matchPhrase(field, v as string);
    case 'oneOf': {
      const values = v as string[];
      return values.length === 1
        ? matchPhrase(field, values[0])
        : { bool: { minimum_should_match: 1, should: values.map((x) => matchPhrase(field, x)) } };
    }
    case 'matches':
      return { bool: { filter: { wildcard: { [field]: v } } } };
    case 'exists':
      return { bool: { minimum_should_match: 1, should: [{ exists: { field } }] } };
    case 'list': {
      const { listType, values } = v as { listType: string; values: string[] };
      if (listType === 'ip_range') {
        const dash = values.filter((x) => x.includes('-'));
        const slash = values.filter((x) => !x.includes('-'));
        const clauses: Dir[] = dash.map((r) => {
          const [gte, lte] = r.split('-');
          return { range: { [field]: { gte, lte } } };
        });
        if (slash.length) clauses.push({ terms: { [field]: slash } });
        return { bool: { should: clauses, minimum_should_match: 1 } };
      }
      return { bool: { filter: { terms: { [field]: values } } } };
    }
    default:
      throw new Error(op);
  }
};
const dslClause = (op: string, included: boolean, field: string, v: unknown): Dir => {
  const base = baseClause(op, field, v);
  return included ? base : { bool: { must_not: base } };
};
const exceptionFilter = (clause: Dir) => ({ bool: { must_not: { bool: { should: [clause] } } } });

// ---- the direct translation ----
const lit = (type: string, v: string): string => {
  if (
    [
      'integer',
      'long',
      'short',
      'byte',
      'double',
      'float',
      'half_float',
      'scaled_float',
      'unsigned_long',
    ].includes(type) &&
    /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(v)
  )
    return v;
  if (type === 'boolean' && (v === 'true' || v === 'false')) return v;
  return JSON.stringify(v);
};
const naiveKept = (
  op: string,
  included: boolean,
  field: string,
  type: string,
  v: unknown
): string | undefined => {
  const col = field
    .split('.')
    .map((s) => (/^[A-Za-z_@][A-Za-z0-9_]*$/.test(s) ? s : `\`${s}\``))
    .join('.');
  let positive: string;
  switch (op) {
    case 'is':
      positive = `${col} == ${lit(type, v as string)}`;
      break;
    case 'oneOf':
      positive = `${col} IN (${(v as string[]).map((x) => lit(type, x)).join(', ')})`;
      break;
    case 'matches':
      positive = `${col} LIKE ${JSON.stringify(v)}`;
      break;
    case 'exists':
      positive = `${col} IS NOT NULL`;
      break;
    case 'list': {
      const { listType, values } = v as { listType: string; values: string[] };
      if (listType === 'ip_range') {
        positive = values
          .map((x) =>
            x.includes('-')
              ? `(${col} >= ${JSON.stringify(x.split('-')[0])} AND ${col} <= ${JSON.stringify(
                  x.split('-')[1]
                )})`
              : `CIDR_MATCH(${col}, ${JSON.stringify(x)})`
          )
          .join(' OR ');
      } else {
        positive = `${col} IN (${values.map((x) => JSON.stringify(x)).join(', ')})`;
      }
      break;
    }
    default:
      return undefined;
  }
  // rows to keep: not matched by the exception. A positive exception drops the rows that match, a negative one the rows that do not.
  return included ? `NOT (${positive})` : `(${positive})`;
};

// ---- the null-safe direct translation: MV_CONTAINS and MV_LIKE, with typed casts, and no validation of the values ----
const CAST_TYPES = [
  'integer',
  'long',
  'double',
  'unsigned_long',
  'ip',
  'version',
  'date',
  'date_nanos',
];
const safeLit = (colType: string, v: string): string => {
  // a field that is not a usable column has no type to cast to
  if (!CAST_TYPES.includes(colType) && colType !== 'boolean') return JSON.stringify(v);
  if (['keyword', 'text'].includes(colType)) return JSON.stringify(v);
  if (colType === 'boolean') return v === 'true' || v === 'false' ? v : JSON.stringify(v);
  return `${JSON.stringify(v)}::${colType}`;
};
const safeKept = (
  op: string,
  included: boolean,
  field: string,
  colType: string,
  v: unknown
): string | undefined => {
  const col = field
    .split('.')
    .map((s2) => (/^[A-Za-z_@][A-Za-z0-9_]*$/.test(s2) ? s2 : `\`${s2}\``))
    .join('.');
  let positive: string;
  switch (op) {
    case 'is':
      positive = `MV_CONTAINS(${col}, ${safeLit(colType, v as string)})`;
      break;
    case 'oneOf':
      positive = (v as string[])
        .map((x) => `MV_CONTAINS(${col}, ${safeLit(colType, x)})`)
        .join(' OR ');
      break;
    case 'matches':
      positive = `COALESCE(MV_LIKE(${col}, ${JSON.stringify(v)}), false)`;
      break;
    case 'exists':
      positive = `${col} IS NOT NULL`;
      break;
    case 'list': {
      const { listType, values } = v as { listType: string; values: string[] };
      if (listType === 'ip_range') return undefined;
      positive = values.map((x) => `MV_CONTAINS(${col}, ${safeLit(colType, x)})`).join(' OR ');
      break;
    }
    default:
      return undefined;
  }
  return included ? `NOT (${positive})` : `(${positive})`;
};

const entryFor = (op: string, included: boolean, field: string, v: unknown): any => {
  const operator = included ? 'included' : 'excluded';
  switch (op) {
    case 'is':
      return { field, operator, type: 'match', value: v };
    case 'oneOf':
      return { field, operator, type: 'match_any', value: v };
    case 'matches':
      return { field, operator, type: 'wildcard', value: v };
    case 'exists':
      return { field, operator, type: 'exists' };
    case 'list':
      return { field, operator, type: 'list', list: { id: 'l', type: (v as any).listType } };
    default:
      throw new Error(op);
  }
};

interface Scenario {
  type: string;
  op: string;
  included: boolean;
  field: string;
  value: unknown;
}
interface Outcome {
  s: Scenario;
  dsl: { kept?: string[]; error?: string };
  naive: { query?: string; kept?: string[]; error?: string };
  safe: { query?: string; kept?: string[]; error?: string; none?: boolean };
  compiled: { query?: string; kept?: string[]; error?: string; skipped?: string };
}

const kept = async (query: string, filter?: Dir): Promise<{ kept?: string[]; error?: string }> => {
  const r = await call('/_query', 'POST', { query, ...(filter ? { filter } : {}) });
  if (r.error)
    return {
      error: String(r.error.reason ?? JSON.stringify(r.error))
        .split('\n')
        .pop()!
        .slice(0, 160),
    };
  return { kept: r.values.map((x: unknown[]) => x[0] as string).sort() };
};

it('compares the DSL filter with an inlined WHERE', async () => {
  const outcomes: Outcome[] = [];
  const docValue: Record<string, Record<string, string>> = {};
  const notes: string[] = [];

  for (const t of TYPES) {
    const index = `par_${t.name}`;
    await call(`/${index}`, 'DELETE');
    const put = await call(`/${index}`, 'PUT', {
      ...(t.settings ? { settings: t.settings } : {}),
      mappings: { properties: { ...t.mappings } },
    });
    if (put.error) {
      notes.push(`index ${t.name}: ${JSON.stringify(put.error.reason)}`);
      continue;
    }
    const body =
      t.docs
        .flatMap((d) => [JSON.stringify({ index: { _id: d.id } }), JSON.stringify(d.src)])
        .join('\n') + '\n';
    const bulk = await (
      await fetch(`${ES}/${index}/_bulk?refresh=true`, {
        method: 'POST',
        headers: { ...HEADERS, 'Content-Type': 'application/x-ndjson' },
        body,
      })
    ).json();
    for (const item of bulk.items ?? [])
      if (item.index?.error)
        notes.push(`doc ${t.name}/${item.index._id}: ${item.index.error.reason}`);
    docValue[t.name] = Object.fromEntries(
      t.docs.map((d) => [d.id, JSON.stringify(t.field === 'f' ? d.src.f : d.src) ?? '(no field)'])
    );

    const cols = await call('/_query', 'POST', { query: `FROM ${index} | LIMIT 0` });
    const columnType: Record<string, string> = Object.fromEntries(
      (cols.columns ?? []).map((c: any) => [c.name, c.type])
    );
    const columns = new Map<string, string>(Object.entries(columnType));
    const field = t.field;

    const scenarios: Scenario[] = [];
    const add = (op: string, value: unknown) => {
      for (const included of [true, false])
        scenarios.push({ type: t.name, op, included, field, value });
    };
    for (const v of t.is ?? []) add('is', v);
    for (const v of t.oneOf ?? []) add('oneOf', v);
    for (const v of t.matches ?? []) add('matches', v);
    if (t.exists) add('exists', null);
    for (const l of t.lists ?? []) add('list', l);

    for (const s of scenarios) {
      const clause = dslClause(s.op, s.included, s.field, s.value);
      const dsl = await kept(
        `FROM ${index} METADATA _id | KEEP _id | SORT _id`,
        exceptionFilter(clause)
      );
      const direct = naiveKept(s.op, s.included, s.field, columnType[s.field] ?? t.name, s.value);
      const naive: Outcome['naive'] = {};
      if (direct) {
        naive.query = `WHERE ${direct}`;
        Object.assign(
          naive,
          await kept(`FROM ${index} METADATA _id | WHERE ${direct} | KEEP _id | SORT _id`)
        );
      }
      const safe: Outcome['safe'] = {};
      const safeClause = safeKept(
        s.op,
        s.included,
        s.field,
        columnType[s.field] ?? t.name,
        s.value
      );
      if (safeClause) {
        safe.query = `WHERE ${safeClause}`;
        Object.assign(
          safe,
          await kept(`FROM ${index} METADATA _id | WHERE ${safeClause} | KEEP _id | SORT _id`)
        );
      } else {
        safe.none = true;
      }
      const compiled: Outcome['compiled'] = {};
      const item = getExceptionListItemSchemaMock({
        item_id: 'x',
        entries: [entryFor(s.op, s.included, s.field, s.value)] as never,
      });
      let result: any;
      try {
        result = compileEndStageItem(item, columns);
      } catch (error) {
        result = { code: 'compiler_threw', reason: String((error as Error).message) };
      }
      if ('clause' in result) {
        compiled.query = `WHERE ${result.clause}`;
        Object.assign(
          compiled,
          await kept(`FROM ${index} METADATA _id | WHERE ${result.clause} | KEEP _id | SORT _id`)
        );
      } else {
        compiled.skipped = `${result.code}: ${result.reason}`.slice(0, 200);
      }
      outcomes.push({ s, dsl, naive, safe, compiled });
    }

    // nested entries
    if (t.nested) {
      const inner = (op: string, included: boolean, innerField: string, v: unknown) => {
        const clause = dslClause(op, included, `nested_user.${innerField}`, v);
        return {
          nested: {
            path: 'nested_user',
            query: { bool: { filter: [clause] } },
            score_mode: 'none',
          },
        };
      };
      const cases: Array<[string, boolean, string, unknown]> = [
        ['is', true, 'name', 'svc'],
        ['is', false, 'name', 'svc'],
        ['oneOf', true, 'name', ['svc', 'bob']],
        ['exists', true, 'age', null],
        ['exists', false, 'age', null],
      ];
      for (const [op, included, innerField, v] of cases) {
        const s: Scenario = {
          type: 'nested',
          op: `nested ${op}`,
          included,
          field: `nested_user.${innerField}`,
          value: v,
        };
        const dsl = await kept(
          `FROM ${index} METADATA _id | KEEP _id | SORT _id`,
          exceptionFilter(inner(op, included, innerField, v))
        );
        const direct = naiveKept(op, included, `nested_user.${innerField}`, 'keyword', v);
        const naive: Outcome['naive'] = { query: `WHERE ${direct}` };
        Object.assign(
          naive,
          await kept(`FROM ${index} METADATA _id | WHERE ${direct} | KEEP _id | SORT _id`)
        );
        const safeNested: Outcome['safe'] = { query: naive.query };
        Object.assign(safeNested, naive);
        outcomes.push({
          s,
          dsl,
          naive,
          safe: safeNested,
          compiled: { skipped: 'entry_type_not_supported (nested entries have no ES|QL form)' },
        });
      }
    }
    await call(`/${index}`, 'DELETE');
  }

  writeFileSync(`${OUT}/outcomes.json`, JSON.stringify({ outcomes, docValue, notes }, null, 1));
  expect(outcomes.length).toBeGreaterThan(0);
});
