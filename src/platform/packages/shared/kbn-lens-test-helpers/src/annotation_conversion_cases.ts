/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared case matrix for converting DSL query annotations to ES|QL annotations.
 *
 * Single source of truth consumed by two layers:
 * - unit tests (@kbn/lens-common): assert the generated query and column bindings
 * - Scout API tests (Lens plugin): execute the generated queries against Elasticsearch
 *   and assert the result columns match the bindings
 *
 * Queries reference fields of the `logstash_functional` ES archive, whose data view
 * uses `@timestamp` as its time field (`ANNOTATION_CONVERSION_TIME_FIELD`).
 */
export const ANNOTATION_CONVERSION_TIME_FIELD = '@timestamp';

/** The query-annotation properties the conversion reads, kept structural to stay dependency-free. */
export interface AnnotationConversionInput {
  readonly filter?: { readonly query: string; readonly language: 'kuery' | 'lucene' };
  readonly timeField?: string;
  readonly textVisibility?: boolean;
  readonly textField?: string;
  readonly extraFields?: readonly string[];
}

export interface AnnotationConversionCase {
  readonly description: string;
  readonly annotation: AnnotationConversionInput;
  readonly expectedEsql: string;
  readonly expectedTimeColumn: string;
  readonly expectedTextColumn?: string;
  readonly expectedExtraColumns?: readonly string[];
  /** Column names Elasticsearch returns for `expectedEsql`. */
  readonly expectedResultColumns: readonly string[];
}

export const buildAnnotationConversionCases = ({
  index,
}: {
  index: string;
}): AnnotationConversionCase[] => [
  {
    description: 'KQL with text and tooltip fields',
    annotation: {
      filter: { query: 'machine.os.raw : "osx"', language: 'kuery' },
      textVisibility: true,
      textField: 'geo.src',
      extraFields: ['geo.dest'],
    },
    expectedEsql: `FROM ${index} | WHERE KQL("""machine.os.raw : "osx"""") | KEEP \`@timestamp\`, \`geo.src\`, \`geo.dest\``,
    expectedTimeColumn: '@timestamp',
    expectedTextColumn: 'geo.src',
    expectedExtraColumns: ['geo.dest'],
    expectedResultColumns: ['@timestamp', 'geo.src', 'geo.dest'],
  },
  {
    description: 'KQL ending in a quoted value',
    annotation: { filter: { query: 'geo.src : "CN"', language: 'kuery' } },
    expectedEsql: `FROM ${index} | WHERE KQL("""geo.src : "CN"""") | KEEP \`@timestamp\``,
    expectedTimeColumn: '@timestamp',
    expectedResultColumns: ['@timestamp'],
  },
  {
    description: 'Lucene',
    annotation: { filter: { query: 'machine.os.raw:osx', language: 'lucene' } },
    expectedEsql: `FROM ${index} | WHERE QSTR("""machine.os.raw:osx""") | KEEP \`@timestamp\``,
    expectedTimeColumn: '@timestamp',
    expectedResultColumns: ['@timestamp'],
  },
  {
    description: 'an empty query without a WHERE clause',
    annotation: { filter: { query: '', language: 'kuery' } },
    expectedEsql: `FROM ${index} | KEEP \`@timestamp\``,
    expectedTimeColumn: '@timestamp',
    expectedResultColumns: ['@timestamp'],
  },
  {
    description: 'a query annotation whose filter has not been set yet',
    annotation: {},
    expectedEsql: `FROM ${index} | KEEP \`@timestamp\``,
    expectedTimeColumn: '@timestamp',
    expectedResultColumns: ['@timestamp'],
  },
  {
    description: 'a text field that is not shown as text',
    annotation: { textVisibility: false, textField: 'geo.src', extraFields: ['geo.dest'] },
    expectedEsql: `FROM ${index} | KEEP \`@timestamp\`, \`geo.dest\``,
    expectedTimeColumn: '@timestamp',
    expectedExtraColumns: ['geo.dest'],
    expectedResultColumns: ['@timestamp', 'geo.dest'],
  },
  {
    description: 'a non-default time field and a text field that is also a tooltip field',
    annotation: {
      timeField: 'utc_time',
      textVisibility: true,
      textField: 'geo.src',
      extraFields: ['geo.src', 'machine.os.raw'],
    },
    expectedEsql: `FROM ${index} | KEEP \`utc_time\`, \`geo.src\`, \`machine.os.raw\``,
    expectedTimeColumn: 'utc_time',
    expectedTextColumn: 'geo.src',
    expectedExtraColumns: ['geo.src', 'machine.os.raw'],
    expectedResultColumns: ['utc_time', 'geo.src', 'machine.os.raw'],
  },
];
