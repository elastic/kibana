/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendSetWhereClauseToESQLQuery } from './append_set_to_query';

describe('appendSetToWhereClause', () => {
  const baseQuery = 'FROM my_index';
  const fields = ['host.name', 'region'];
  const values = ['host-a', 'us-east-1'];
  const types = ['string', 'string'];

  it('adds a positive set to a query without a WHERE clause', () => {
    const result = appendSetWhereClauseToESQLQuery(baseQuery, fields, values, '+', types);
    expect(result).toBe('FROM my_index\n| WHERE (`host.name`=="host-a" AND `region`=="us-east-1")');
  });

  it('adds a negative set to a query without a WHERE clause', () => {
    const result = appendSetWhereClauseToESQLQuery(baseQuery, fields, values, '-', types);
    expect(result).toBe(
      'FROM my_index\n| WHERE NOT (`host.name`=="host-a" AND `region`=="us-east-1")'
    );
  });

  it('adds a positive set to a query with an existing WHERE clause', () => {
    const query = 'FROM my_index | WHERE status == "200"';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '+', types);
    expect(result).toBe(
      'FROM my_index | WHERE status == "200"\nAND (`host.name`=="host-a" AND `region`=="us-east-1")'
    );
  });

  it('adds a negative set to a query with an existing WHERE clause', () => {
    const query = 'FROM my_index | WHERE status == "200"';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '-', types);
    expect(result).toBe(
      'FROM my_index | WHERE status == "200"\nAND NOT (`host.name`=="host-a" AND `region`=="us-east-1")'
    );
  });

  it('toggles a negative set to a positive set', () => {
    const query =
      'FROM my_index | WHERE status == "200"\nAND NOT (`host.name`=="host-a" AND `region`=="us-east-1")';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '+', types);
    expect(result).toBe(
      'FROM my_index | WHERE status == "200"\nAND (`host.name`=="host-a" AND `region`=="us-east-1")'
    );
  });

  it('toggles a negative set to a positive set when its the only where clause', () => {
    const query = 'FROM my_index | WHERE NOT (`host.name`=="host-a" AND `region`=="us-east-1")';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '+', types);
    expect(result).toBe('FROM my_index | WHERE (`host.name`=="host-a" AND `region`=="us-east-1")');
  });

  it('toggles a positive set to a negative set', () => {
    const query =
      'FROM my_index | WHERE status == "200"\nAND (`host.name`=="host-a" AND `region`=="us-east-1")';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '-', types);
    expect(result).toBe(
      'FROM my_index | WHERE status == "200"\nAND NOT (`host.name`=="host-a" AND `region`=="us-east-1")'
    );
  });

  it('does not change the query if the positive set already exists', () => {
    const query =
      'FROM my_index | WHERE status == "200"\nAND (`host.name`=="host-a" AND `region`=="us-east-1")';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '+', types);
    expect(result).toBe(query);
  });

  it('does not change the query if the negative set already exists', () => {
    const query =
      'FROM my_index | WHERE status == "200"\nAND NOT (`host.name`=="host-a" AND `region`=="us-east-1")';
    const result = appendSetWhereClauseToESQLQuery(query, fields, values, '-', types);
    expect(result).toBe(query);
  });

  it('handles mixed types and casting correctly', () => {
    const mixedFields = ['response.code', 'src.ip'];
    const mixedValues = [404, '127.0.0.1'];
    const mixedTypes = ['number', 'ip'];
    const result = appendSetWhereClauseToESQLQuery(
      baseQuery,
      mixedFields,
      mixedValues,
      '+',
      mixedTypes
    );
    expect(result).toBe(
      'FROM my_index\n| WHERE (`response.code`==404 AND `src.ip`::string=="127.0.0.1")'
    );
  });

  it('handles null values correctly in a set', () => {
    const nullValues = ['host-c', null];
    const result = appendSetWhereClauseToESQLQuery(baseQuery, fields, nullValues, '+', types);
    expect(result).toBe('FROM my_index\n| WHERE (`host.name`=="host-c" AND `region` is null)');
  });
});
