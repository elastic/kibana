/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendToESQLQuery } from '@kbn/esql-utils';
import {
  FAILED_SPAN_CONDITION,
  operationToEsqlCondition,
  selectionToEsqlCondition,
} from '@kbn/trace-latency-map';
import { extractFilters } from '../../../utils';
import { appendMapClause, removeMapSetResidue, removeWhere } from './latency_map_query_clauses';

const query = 'FROM traces-apm*\n| WHERE service.name == "cart"';
const clause = '@timestamp >= TO_DATETIME("2026-10-26T10:00:00.000Z") AND (duration >= 1000)';
const selectionClause = selectionToEsqlCondition({
  from: '2026-10-26T10:00:00.000Z',
  to: '2026-10-26T10:05:00.000Z',
  minDuration: 1_000_000,
  maxDuration: 5_000_000,
});

describe('removeWhere', () => {
  it('takes off a WHERE clause appendToESQLQuery added', () => {
    expect(removeWhere(appendToESQLQuery(query, `| WHERE ${clause}`), clause)).toBe(query);
  });

  it('removes the clause wherever it sits in the query', () => {
    const middle = `FROM traces-apm*\n| WHERE ${clause}\n| WHERE service.name == "cart"`;
    expect(removeWhere(middle, clause)).toBe(query);
  });

  it('leaves a query without the clause as it is', () => {
    const appended = appendToESQLQuery(query, `| WHERE ${clause}`);
    expect(removeWhere(query, clause)).toBe(query);
    expect(removeWhere(appended, clause.replace('duration', 'durationX'))).toBe(appended);
  });

  it('removes the clause by its span, leaving the rest of the query byte for byte', () => {
    // The user's own spacing, case and comments, around the clause and on other commands.
    const own = `FROM traces-apm*   // the source\n|   where ${clause}\n| WHERE service.name == "cart" // mine\n| LIMIT 10`;
    expect(removeWhere(own, clause)).toBe(
      'FROM traces-apm*   // the source\n| WHERE service.name == "cart" // mine\n| LIMIT 10'
    );
  });

  it('finds the clause as the parser reads it, under extra spaces or a trailing comment', () => {
    const spaced = clause.replace(' AND ', '   AND  ');
    // The comment is the user's, and stays.
    expect(removeWhere(`${query}\n| WHERE ${spaced} // added`, clause)).toBe(`${query} // added`);
  });

  it('leaves a user clause that merely starts with the map clause alone', () => {
    const longer = `${query}\n| WHERE ${clause} OR service.name == "cart"`;
    expect(removeWhere(longer, clause)).toBe(longer);
  });

  it('removes only the first of two equal clauses', () => {
    const twice = `${query}\n| WHERE ${clause}\n| WHERE ${clause}`;
    expect(removeWhere(twice, clause)).toBe(`${query}\n| WHERE ${clause}`);
  });

  it('leaves a WHERE inside a FORK branch alone', () => {
    const forked = `FROM traces-apm*\n| FORK (WHERE ${clause}) (WHERE service.name == "cart")`;
    expect(removeWhere(forked, clause)).toBe(forked);
  });

  it('leaves a query that does not parse alone', () => {
    const broken = `${query}\n| WHERE ${clause}\n| WHERE`;
    expect(removeWhere(broken, clause)).toBe(broken);
  });

  it('recognises every clause the map writes as the parser prints it', () => {
    const selection = {
      from: '2026-10-26T10:00:00.000Z',
      to: '2026-10-26T10:05:00.000Z',
      minDuration: 1_000_000,
      maxDuration: 5_000_000,
    };
    const clauses = [
      selectionToEsqlCondition(selection),
      selectionToEsqlCondition({ ...selection, failedOnly: true }),
      FAILED_SPAN_CONDITION,
      operationToEsqlCondition({ service: 'cart', name: 'GET /where|:id "quoted"' }),
    ];
    for (const written of clauses) {
      expect(extractFilters(`${query}\n| WHERE ${written}`)).toEqual([
        'service.name == "cart"',
        written,
      ]);
      expect(removeWhere(`${query}\n| WHERE ${written}`, written)).toBe(query);
    }
  });
});

describe('appendMapClause', () => {
  it('sets unmapped fields to null once, so a source without a field of the clause still runs', () => {
    const once = appendMapClause(query, clause);
    expect(once).toBe(
      `SET unmapped_fields="NULLIFY";\n${appendToESQLQuery(query, `| WHERE ${clause}`)}`
    );
    expect(
      appendMapClause(once, '(status.code == "Error")').match(/SET unmapped_fields/g)
    ).toHaveLength(1);
  });

  it('leaves a query that already sets it', () => {
    const own = `SET unmapped_fields="LOAD";\n${query}`;
    expect(appendMapClause(own, clause)).toBe(appendToESQLQuery(own, `| WHERE ${clause}`));
  });

  it('writes no SET when the host knows every referenced field is mapped', () => {
    expect(appendMapClause(query, clause, { nullify: false })).toBe(
      appendToESQLQuery(query, `| WHERE ${clause}`)
    );
  });

  it('removes the clause again', () => {
    expect(removeWhere(appendMapClause(query, clause), clause)).toBe(
      `SET unmapped_fields="NULLIFY";\n${query}`
    );
  });

  it('puts the clause before the first LIMIT, keeping the line breaks, and takes it back', () => {
    // The map shows every span of the range: a region drawn on it selects among all of
    // them, not among the rows the limit happened to keep.
    const limited = `${query}\n| SORT @timestamp DESC\n| LIMIT 100`;
    const appended = appendMapClause(limited, clause, { nullify: false });
    expect(appended).toBe(`${query}\n| SORT @timestamp DESC\n| WHERE ${clause}\n| LIMIT 100`);
    expect(removeWhere(appended, clause)).toBe(limited);

    const inline = 'FROM traces-apm* | LIMIT 100';
    expect(appendMapClause(inline, clause, { nullify: false })).toBe(
      `FROM traces-apm*\n| WHERE ${clause} | LIMIT 100`
    );
  });

  it('sees a SET the user wrote with other spacing', () => {
    const own = `SET  unmapped_fields = "LOAD" ;\n${query}`;
    expect(appendMapClause(own, clause)).toBe(appendToESQLQuery(own, `| WHERE ${clause}`));
  });

  it('is not fooled by the words of a SET inside a string literal', () => {
    const literal = `${query} AND span.name == "SET unmapped_fields"`;
    expect(appendMapClause(literal, clause)).toBe(
      `SET unmapped_fields="NULLIFY";\n${appendToESQLQuery(literal, `| WHERE ${clause}`)}`
    );
  });
});

describe('removeMapSetResidue', () => {
  it('takes the SET back off once the last map clause is gone, restoring the query exactly', () => {
    const appended = appendMapClause(query, selectionClause);
    expect(removeMapSetResidue(removeWhere(appended, selectionClause))).toBe(query);
  });

  it('keeps the SET while another map clause still needs it', () => {
    const both = appendMapClause(appendMapClause(query, selectionClause), FAILED_SPAN_CONDITION);
    const withoutSelection = removeWhere(both, selectionClause);
    expect(removeMapSetResidue(withoutSelection)).toBe(withoutSelection);
  });

  it('never touches a SET the user wrote, with or without map clauses', () => {
    const own = `SET unmapped_fields="LOAD";\n${query}`;
    expect(removeMapSetResidue(own)).toBe(own);
    // Same value but the user's own spacing: not the exact prefix the map writes.
    const ownNullify = `SET unmapped_fields="NULLIFY"; ${query}`;
    expect(removeMapSetResidue(ownNullify)).toBe(ownNullify);
  });
});
