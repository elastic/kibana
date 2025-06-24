/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  appendToESQLQuery,
  appendWhereClauseToESQLQuery,
  appendStatsByToQuery,
} from './append_to_query';

describe('appendToQuery', () => {
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

  describe('appendWhereClauseToESQLQuery', () => {
    it('appends a filter in where clause in an existing query', () => {
      expect(
        appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '+', 'string')
      ).toBe(
        `from logstash-* // meow
| WHERE \`dest\`=="tada!"`
      );
    });
    it('appends a filter out where clause in an existing query', () => {
      expect(
        appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '-', 'string')
      ).toBe(
        `from logstash-* // meow
| WHERE \`dest\`!="tada!"`
      );
    });

    it('appends a where clause in an existing query with casting to string when the type is not string or number', () => {
      expect(
        appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '-', 'ip')
      ).toBe(
        `from logstash-* // meow
| WHERE \`dest\`::string!="tada!"`
      );
    });

    it('appends a where clause in an existing query with casting to string when the type is not given', () => {
      expect(appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '-')).toBe(
        `from logstash-* // meow
| WHERE \`dest\`::string!="tada!"`
      );
    });

    it('appends a where clause in an existing query checking that the value is not null if the user asks for existence', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* // meow',
          'dest',
          undefined,
          'is_not_null',
          'string'
        )
      ).toBe(
        `from logstash-* // meow
| WHERE \`dest\` is not null`
      );
    });

    it('appends a where clause in an existing query checking that the value is null if the user filters a null value', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* // meow',
          'dest',
          undefined,
          'is_null',
          'string'
        )
      ).toBe(
        `from logstash-* // meow
| WHERE \`dest\` is null`
      );
    });

    it('appends an and clause in an existing query with where command as the last pipe', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* | where country == "GR"',
          'dest',
          'Crete',
          '+',
          'string'
        )
      ).toBe(
        `from logstash-* | where country == "GR"
AND \`dest\`=="Crete"`
      );
    });

    it('doesnt append anything in an existing query with where command as the last pipe if the filter preexists', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* | where country == "GR"',
          'country',
          'GR',
          '+',
          'string'
        )
      ).toBe(`from logstash-* | where country == "GR"`);
    });

    it('doesnt append anything in an existing query with where command as the last pipe if the _exists_ filter preexists', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* | where country IS NOT NULL',
          'country',
          undefined,
          'is_not_null',
          'string'
        )
      ).toBe(`from logstash-* | where country IS NOT NULL`);
    });

    it('changes the operator in an existing query with where command as the last pipe if the filter preexists but has the opposite operator', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* | where country == "GR"',
          'country',
          'GR',
          '-',
          'string'
        )
      ).toBe(`from logstash-* | where country != "GR"`);
    });

    it('changes the operator in an existing query with where command as the last pipe if the filter preexists but has the opposite operator, the field has backticks', () => {
      expect(
        appendWhereClauseToESQLQuery(
          'from logstash-* | where `country` == "GR"',
          'country',
          'GR',
          '-',
          'string'
        )
      ).toBe(`from logstash-* | where \`country\`!= "GR"`);
    });

    it('appends an and clause in an existing query with where command as the last pipe if the filter preexists but the operator is not the correct one', () => {
      expect(
        appendWhereClauseToESQLQuery(
          `from logstash-* | where CIDR_MATCH(ip1, "127.0.0.2/32", "127.0.0.3/32")`,
          'ip',
          '127.0.0.2/32',
          '-',
          'ip'
        )
      ).toBe(
        `from logstash-* | where CIDR_MATCH(ip1, "127.0.0.2/32", "127.0.0.3/32")
and \`ip\`::string!="127.0.0.2/32"`
      );
    });

    it('returns undefined for multivalue fields', () => {
      expect(
        appendWhereClauseToESQLQuery('from logstash-*', 'dest', ['meow'], '+', 'string')
      ).toBeUndefined();
    });
  });

  describe('appendStatsByToQuery', () => {
    it('should append the stats by clause to the query', () => {
      const queryString = 'FROM my_index';
      const statsBy = 'my_field';
      const updatedQueryString = appendStatsByToQuery(queryString, statsBy);
      expect(updatedQueryString).toBe('FROM my_index\n| STATS BY my_field');
    });

    it('should append the stats by clause to the query with existing clauses', () => {
      const queryString = 'FROM my_index | LIMIT 10 | STATS BY meow';
      const statsBy = 'my_field';
      const updatedQueryString = appendStatsByToQuery(queryString, statsBy);
      expect(updatedQueryString).toBe('FROM my_index | LIMIT 10\n| STATS BY my_field');
    });
  });
});
