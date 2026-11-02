/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolveEsqlVariables } from './resolve_esql_variables';
import { ESQLVariableType } from '@kbn/esql-types';

describe('resolveEsqlVariables', () => {
  it('replaces a string variable with a quoted literal', () => {
    expect(
      resolveEsqlVariables({ esql: 'FROM traces-apm* | WHERE ?event_type == "Bad"' }, [
        { key: 'event_type', value: 'Bad', type: ESQLVariableType.VALUES },
      ])
    ).toEqual({ esql: 'FROM traces-apm* | WHERE "Bad" == "Bad"' });
  });

  it('replaces a numeric variable without quotes', () => {
    expect(
      resolveEsqlVariables({ esql: 'FROM metrics-* | WHERE http.status == ?status_code' }, [
        { key: 'status_code', value: 200, type: ESQLVariableType.VALUES },
      ])
    ).toEqual({ esql: 'FROM metrics-* | WHERE http.status == 200' });
  });

  it('replaces all occurrences of the same variable', () => {
    expect(
      resolveEsqlVariables(
        {
          esql: 'FROM traces-apm* | WHERE ?event_type == "Bad" OR ?event_type == "Good"',
        },
        [{ key: 'event_type', value: 'All', type: ESQLVariableType.VALUES }]
      )
    ).toEqual({
      esql: 'FROM traces-apm* | WHERE "All" == "Bad" OR "All" == "Good"',
    });
  });

  it('returns the query unchanged when variables is empty', () => {
    const query = { esql: 'FROM traces-apm* | WHERE ?event_type == "Bad"' };
    expect(resolveEsqlVariables(query, [])).toBe(query);
  });

  it('returns the query unchanged when variables is undefined', () => {
    const query = { esql: 'FROM traces-apm* | WHERE ?event_type == "Bad"' };
    expect(resolveEsqlVariables(query, undefined)).toBe(query);
  });

  it('escapes double quotes in string values to produce valid ES|QL', () => {
    expect(
      resolveEsqlVariables({ esql: 'FROM logs* | WHERE host.name == ?host_name' }, [
        { key: 'host_name', value: 'host"01', type: ESQLVariableType.VALUES },
      ])
    ).toEqual({ esql: 'FROM logs* | WHERE host.name == "host""01"' });
  });

  it('passes non-esql queries through unchanged', () => {
    const query = { query: 'service.name: my-service', language: 'kuery' };
    expect(
      resolveEsqlVariables(query, [{ key: 'x', value: '1', type: ESQLVariableType.VALUES }])
    ).toBe(query);
  });

  it('correctly replaces both variables when one key is a prefix of another', () => {
    expect(
      resolveEsqlVariables({ esql: 'FROM logs* | WHERE ?a == 1 AND ?ab == 2' }, [
        { key: 'a', value: 'X', type: ESQLVariableType.VALUES },
        { key: 'ab', value: 'Y', type: ESQLVariableType.VALUES },
      ])
    ).toEqual({ esql: 'FROM logs* | WHERE "X" == 1 AND "Y" == 2' });
  });
});
