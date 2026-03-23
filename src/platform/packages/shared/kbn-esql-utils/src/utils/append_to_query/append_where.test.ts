/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendWhereClauseToESQLQuery } from './append_where';

describe('appendWhereClauseToESQLQuery', () => {
  it('appends a filter in where clause in an existing query', () => {
    expect(
      appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '+', 'string')
    ).toBe(
      `from logstash-* // meow
| WHERE \`dest\` == "tada!"`
    );
  });
  it('appends a filter out where clause in an existing query', () => {
    expect(
      appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '-', 'string')
    ).toBe(
      `from logstash-* // meow
| WHERE \`dest\` != "tada!"`
    );
  });

  it('appends a where clause in an existing query with casting to string when the type is not string or number', () => {
    expect(
      appendWhereClauseToESQLQuery('from logstash-* // meow', 'ip_field', 'tada!', '-', 'ip')
    ).toBe(
      `from logstash-* // meow
| WHERE \`ip_field\` != "tada!"`
    );
  });

  it('appends a where clause in an existing query with casting to string when the type is not given', () => {
    expect(appendWhereClauseToESQLQuery('from logstash-* // meow', 'dest', 'tada!', '-')).toBe(
      `from logstash-* // meow
| WHERE \`dest\`::string != "tada!"`
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
AND \`dest\` == "Crete"`
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
AND \`ip\` != "127.0.0.2/32"`
    );
  });

  it('appends MATCH clauses for multivalue fields with + operation', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-*',
        'tags.keyword',
        ['info', 'success'],
        '+',
        'string'
      )
    ).toBe(
      `from logstash-*
| WHERE MATCH(\`tags.keyword\`, "info") AND MATCH(\`tags.keyword\`, "success")`
    );
  });

  it('appends NOT MATCH clauses for multivalue fields with - operation', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-*',
        'tags.keyword',
        ['info', 'success'],
        '-',
        'string'
      )
    ).toBe(
      `from logstash-*
| WHERE NOT MATCH(\`tags.keyword\`, "info") AND NOT MATCH(\`tags.keyword\`, "success")`
    );
  });

  it('appends AND MATCH clauses for multivalue fields when WHERE clause already exists', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-* | WHERE country == "GR"',
        'tags.keyword',
        ['info', 'success'],
        '+',
        'string'
      )
    ).toBe(
      `from logstash-* | WHERE country == "GR"
AND MATCH(\`tags.keyword\`, "info") AND MATCH(\`tags.keyword\`, "success")`
    );
  });

  it('does not append MATCH clauses for multivalue fields when WHERE clause already exists with the same filters', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-* | WHERE MATCH(`tags.keyword`, "info") AND MATCH(`tags.keyword`, "success")',
        'tags.keyword',
        ['info', 'success'],
        '+',
        'string'
      )
    ).toBe(
      `from logstash-* | WHERE MATCH(\`tags.keyword\`, "info") AND MATCH(\`tags.keyword\`, "success")`
    );
  });

  it('negates the MATCH clauses for multivalue fields when WHERE clause already exists with the same filters', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-* | WHERE MATCH(`tags.keyword`, "info") AND MATCH(`tags.keyword`, "success")',
        'tags.keyword',
        ['info', 'success'],
        '-',
        'string'
      )
    ).toBe(
      `from logstash-* | WHERE NOT MATCH(\`tags.keyword\`, "info") AND NOT MATCH(\`tags.keyword\`, "success")`
    );
  });

  it('handles existence checks for multivalue fields with is_not_null', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-*',
        'tags.keyword',
        ['info', 'success'],
        'is_not_null',
        'string'
      )
    ).toBe(
      `from logstash-*
| WHERE \`tags.keyword\` is not null`
    );
  });

  it('handles existence checks for multivalue fields with is_null', () => {
    expect(
      appendWhereClauseToESQLQuery(
        'from logstash-*',
        'tags.keyword',
        ['info', 'success'],
        'is_null',
        'string'
      )
    ).toBe(
      `from logstash-*
| WHERE \`tags.keyword\` is null`
    );
  });

  it('properly escapes values containing line breaks', () => {
    const messageWithLineBreaks = `Error occurred at line 10\nStack trace:\n  at function foo()`;

    expect(
      appendWhereClauseToESQLQuery(
        'from logs-*',
        'exception.message',
        messageWithLineBreaks,
        '+',
        'string'
      )
    ).toBe(
      `from logs-*
| WHERE \`exception.message\` == "Error occurred at line 10\\nStack trace:\\n  at function foo()"`
    );
  });

  it('properly escapes values containing carriage returns and tabs', () => {
    const messageWithReturnsAndTabs = 'Error\r\nwith\ttabs';

    expect(
      appendWhereClauseToESQLQuery(
        'from logs-*',
        'message',
        messageWithReturnsAndTabs,
        '+',
        'string'
      )
    ).toBe(
      `from logs-*
| WHERE \`message\` == "Error\\r\\nwith\\ttabs"`
    );
  });

  it('properly escapes line breaks in multivalue MATCH clauses', () => {
    const valuesWithLineBreaks = ['error\nmessage', 'another\nvalue'];

    expect(
      appendWhereClauseToESQLQuery('from logs-*', 'message', valuesWithLineBreaks, '+', 'string')
    ).toBe(
      `from logs-*
| WHERE MATCH(\`message\`, "error\\nmessage") AND MATCH(\`message\`, "another\\nvalue")`
    );
  });

  it('properly escapes all possible special characters in a string value', () => {
    const complexValue = 'Error: "path\\to\\file"\nStack trace\r\nwith\ttabs';

    expect(
      appendWhereClauseToESQLQuery('from logs-*', 'message', complexValue, '+', 'string')
    ).toBe(
      `from logs-*
| WHERE \`message\` == "Error: \\"path\\\\to\\\\file\\"\\nStack trace\\r\\nwith\\ttabs"`
    );
  });
});
