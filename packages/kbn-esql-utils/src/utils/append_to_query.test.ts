/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { appendToESQLQuery } from './append_to_query';

describe('appendToESQLQuery', () => {
  it('append the text on a new line after the query', () => {
    expect(appendToESQLQuery('from logstash-* // meow', '| stats var = avg(woof)')).toBe(
      `from logstash-* // meow
| stats var = avg(woof)`
    );
  });

  it('append the text on a new line after the query for text with variables', () => {
    const limit = 10;
    expect(appendToESQLQuery('from logstash-*', `| limit ${limit}`)).toBe(
      `from logstash-*
| limit 10`
    );
  });
});
