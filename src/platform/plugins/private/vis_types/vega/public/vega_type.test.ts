/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vegaVisType } from './vega_type';

jest.mock('./default_spec', () => ({
  getDefaultSpec: jest.fn(() => ''),
}));

describe('vegaVisType.getEsqlQuery', () => {
  it('returns the ES|QL query from a single-source spec', () => {
    const query = 'FROM logs-* | WHERE machine.os.keyword == ?fizzbuzz';

    expect(
      vegaVisType.getEsqlQuery?.({
        spec: `{ data: { url: { "%type%": "esql", query: "${query}" } } }`,
      })
    ).toEqual({ esql: query });
  });

  it('is unset when the spec has no ES|QL source', () => {
    expect(vegaVisType.getEsqlQuery?.({ spec: '{ mark: "point" }' })).toBeUndefined();
  });

  it('is unset when the spec is invalid', () => {
    expect(vegaVisType.getEsqlQuery?.({ spec: 'not valid { spec' })).toBeUndefined();
  });
});
