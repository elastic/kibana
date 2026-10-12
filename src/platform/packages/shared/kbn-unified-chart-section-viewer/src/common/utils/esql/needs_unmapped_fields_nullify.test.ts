/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { needsUnmappedFieldsNullify } from './needs_unmapped_fields_nullify';

describe('needsUnmappedFieldsNullify', () => {
  it.each([
    ['there is no inherited text', {}],
    ['WHERE entries are empty', { whereStatements: ['', '  ', '\n\t'] }],
    ['WHERE is literals only', { whereStatements: ['1 == 1 AND true', 'NOT NULL'] }],
    [
      'WHERE only names @timestamp',
      { whereStatements: ['(@timestamp IS NULL) OR (@timestamp IS NOT NULL)'] },
    ],
    [
      'WHERE only names data_stream fields',
      {
        whereStatements: [
          'data_stream.type == "metrics" AND data_stream.dataset == "otel" AND data_stream.namespace == "default"',
        ],
      },
    ],
    [
      'breakdown fields are always mapped',
      { splitAccessors: ['@timestamp', 'data_stream.namespace'] },
    ],
    [
      'WHERE and breakdown fields are always mapped',
      {
        whereStatements: ['@timestamp IS NOT NULL'],
        splitAccessors: ['data_stream.type'],
      },
    ],
  ])('omits SET when %s', (_label, input) => {
    expect(needsUnmappedFieldsNullify(input)).toBe(false);
  });

  it.each([
    ['a breakdown names a user field', { splitAccessors: ['host.name'] }],
    ['a wildcard is selected as a breakdown', { splitAccessors: ['host.*'] }],
    ['WHERE names a user field', { whereStatements: ['host.name == "host-01"'] }],
    ['WHERE names an alias', { whereStatements: ['my_alias IS NOT NULL'] }],
    ['WHERE uses an identifier parameter', { whereStatements: ['??col IS NOT NULL'] }],
    ['WHERE uses a value parameter', { whereStatements: ['1 == ?param'] }],
    ['WHERE uses a quoted wildcard', { whereStatements: ['`host.*` IS NOT NULL'] }],
    ['WHERE uses a data_stream wildcard', { whereStatements: ['`data_stream.*` IS NOT NULL'] }],
    ['WHERE uses KQL', { whereStatements: ['KQL("host.name: x")'] }],
    ['WHERE uses MATCH', { whereStatements: ['MATCH(@timestamp, "x")'] }],
    [
      'WHERE calls another function',
      { whereStatements: ['NOW() > 0', 'TO_STRING(@timestamp) == "x"'] },
    ],
    ['WHERE uses arithmetic or IN', { whereStatements: ['1 + 1 == 2', '@timestamp IN (1, 2)'] }],
    ['WHERE does not parse', { whereStatements: ['host.* == "a"', 'WHERE'] }],
    [
      'a pipe smuggles another command into WHERE',
      { whereStatements: ['1 == 1 | WHERE host.name == "a"'] },
    ],
    [
      'one WHERE is safe and another is not',
      { whereStatements: ['@timestamp IS NOT NULL', 'host.name == "a"'] },
    ],
  ])('keeps SET when %s', (_label, input) => {
    expect(needsUnmappedFieldsNullify(input)).toBe(true);
  });
});
