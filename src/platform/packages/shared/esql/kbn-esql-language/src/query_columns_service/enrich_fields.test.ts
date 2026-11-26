/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from '@elastic/esql';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { QueryColumns } from '.';

describe('enrich field metadata query', () => {
  it('quotes enrich field names that are not valid identifiers', async () => {
    const getColumnsFor = jest.fn(async () => [
      { name: 'any#Char$Field', type: 'keyword' as const, userDefined: false as const },
      { name: 'lookup_match', type: 'boolean' as const, userDefined: false as const },
    ]);

    const query =
      'FROM app_events | ENRICH _coordinator:policy ON actor_id | WHERE lookup_match IS NULL';
    const { root } = Parser.parse(query);

    await new QueryColumns(
      root,
      query,
      {
        getColumnsFor,
        getPolicies: async () => [
          {
            name: 'policy',
            sourceIndices: ['users_lookup'],
            matchField: 'user_id',
            enrichFields: ['any#Char$Field', 'lookup_match'],
          },
        ],
      } as ESQLCallbacks,
      { invalidateColumnsCache: true }
    ).asMap();

    expect(getColumnsFor).toHaveBeenCalledWith({
      query: 'FROM users_lookup | KEEP `any#Char$Field`, lookup_match',
    });
  });
});
