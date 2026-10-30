/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { needsUnmappedFieldsNullify } from './needs_unmapped_fields_nullify';

type Input = Parameters<typeof needsUnmappedFieldsNullify>[0];

describe('needsUnmappedFieldsNullify', () => {
  it.each<{ scenario: string; input: Input }>([
    { scenario: 'there is no inherited text', input: {} },
    { scenario: 'WHERE entries are empty', input: { whereStatements: ['', '  ', '\n\t'] } },
    {
      scenario: 'WHERE is literals only',
      input: { whereStatements: ['1 == 1 AND true', 'NOT NULL'] },
    },
    {
      scenario: 'WHERE only names @timestamp',
      input: { whereStatements: ['(@timestamp IS NULL) OR (@timestamp IS NOT NULL)'] },
    },
    {
      scenario: 'WHERE only names data_stream fields',
      input: {
        whereStatements: [
          'data_stream.type == "metrics" AND data_stream.dataset == "otel" AND data_stream.namespace == "default"',
        ],
      },
    },
    {
      scenario: 'breakdown fields are always mapped',
      input: { splitAccessors: ['@timestamp', 'data_stream.namespace'] },
    },
    {
      scenario: 'WHERE and breakdown fields are always mapped',
      input: {
        whereStatements: ['@timestamp IS NOT NULL'],
        splitAccessors: ['data_stream.type'],
      },
    },
  ])('omits SET when $scenario', ({ input }) => {
    expect(needsUnmappedFieldsNullify(input)).toBe(false);
  });

  it.each<{ scenario: string; input: Input }>([
    { scenario: 'a breakdown names a user field', input: { splitAccessors: ['host.name'] } },
    {
      scenario: 'a wildcard is selected as a breakdown',
      input: { splitAccessors: ['host.*'] },
    },
    {
      scenario: 'WHERE names a user field',
      input: { whereStatements: ['host.name == "host-01"'] },
    },
    { scenario: 'WHERE names an alias', input: { whereStatements: ['my_alias IS NOT NULL'] } },
    {
      scenario: 'WHERE uses an identifier parameter',
      input: { whereStatements: ['??col IS NOT NULL'] },
    },
    { scenario: 'WHERE uses a value parameter', input: { whereStatements: ['1 == ?param'] } },
    {
      scenario: 'WHERE uses a quoted wildcard',
      input: { whereStatements: ['`host.*` IS NOT NULL'] },
    },
    {
      scenario: 'WHERE uses a data_stream wildcard',
      input: { whereStatements: ['`data_stream.*` IS NOT NULL'] },
    },
    { scenario: 'WHERE uses KQL', input: { whereStatements: ['KQL("host.name: x")'] } },
    { scenario: 'WHERE uses MATCH', input: { whereStatements: ['MATCH(@timestamp, "x")'] } },
    {
      scenario: 'WHERE calls another function',
      input: { whereStatements: ['NOW() > 0', 'TO_STRING(@timestamp) == "x"'] },
    },
    {
      scenario: 'WHERE uses arithmetic or IN',
      input: { whereStatements: ['1 + 1 == 2', '@timestamp IN (1, 2)'] },
    },
    { scenario: 'WHERE does not parse', input: { whereStatements: ['host.* == "a"', 'WHERE'] } },
    {
      scenario: 'a pipe smuggles another command into WHERE',
      input: { whereStatements: ['1 == 1 | WHERE host.name == "a"'] },
    },
    {
      scenario: 'one WHERE is safe and another is not',
      input: { whereStatements: ['@timestamp IS NOT NULL', 'host.name == "a"'] },
    },
  ])('keeps SET when $scenario', ({ input }) => {
    expect(needsUnmappedFieldsNullify(input)).toBe(true);
  });
});
