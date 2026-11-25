/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLQueryVariables } from '@kbn/esql-utils';
import { getPublishedEsqlQuery } from './spec_uses_esql';

describe('getPublishedEsqlQuery', () => {
  it('publishes a single ES|QL source query verbatim', () => {
    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';
    const spec = {
      data: {
        url: {
          '%type%': 'esql',
          query,
        },
      },
    };

    expect(getPublishedEsqlQuery(spec)).toEqual({ esql: query });
  });

  it('publishes a synthetic query whose variables are the union of multi-source names', () => {
    const spec = {
      data: [
        {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz',
          },
        },
        {
          url: {
            '%type%': 'esql',
            query: 'FROM logs-* | WHERE color.keyword == ?color',
          },
        },
      ],
    };

    const published = getPublishedEsqlQuery(spec);
    expect(published).toBeDefined();
    expect(new Set(getESQLQueryVariables(published!.esql))).toEqual(new Set(['color', 'fizzbuzz']));
  });

  it('is unset when the spec has no ES|QL source', () => {
    expect(getPublishedEsqlQuery({ mark: 'point' })).toBeUndefined();
    expect(getPublishedEsqlQuery(undefined)).toBeUndefined();
  });
});
