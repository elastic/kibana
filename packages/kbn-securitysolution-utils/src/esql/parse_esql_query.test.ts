/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseEsqlQuery } from './parse_esql_query';

describe('parseEsqlQuery', () => {
  describe('ES|QL query syntax', () => {
    it.each([['incorrect syntax'], ['from test* metadata']])(
      'detects incorrect syntax in "%s"',
      (esqlQuery) => {
        const result = parseEsqlQuery(esqlQuery);
        expect(result.errors.length).toEqual(1);
        expect(result.errors[0].message.startsWith('SyntaxError:')).toBeTruthy();
        expect(parseEsqlQuery(esqlQuery)).toMatchObject({
          hasMetadataOperator: false,
          isEsqlQueryAggregating: false,
        });
      }
    );

    it.each([
      ['from test* metadata _id'],
      [
        'FROM kibana_sample_data_logs | STATS total_bytes = SUM(bytes) BY host | WHERE total_bytes > 200000 | SORT total_bytes DESC | LIMIT 10',
      ],
      [
        `from packetbeat* metadata
        _id
        | limit 100`,
      ],
      [
        `FROM kibana_sample_data_logs |
         STATS total_bytes = SUM(bytes) BY host |
         WHERE total_bytes > 200000 |
         SORT total_bytes DESC |
         LIMIT 10`,
      ],
    ])('parses correctly valid syntax in "%s"', (esqlQuery) => {
      const result = parseEsqlQuery(esqlQuery);
      expect(result.errors.length).toEqual(0);
      expect(result).toMatchObject({ errors: [] });
    });
  });

  describe('METADATA operator', () => {
    it.each([
      ['from test*'],
      ['from metadata*'],
      ['from test* | keep metadata'],
      ['from test* | eval x="metadata _id"'],
    ])('detects when METADATA operator is missing in a NON aggregating query "%s"', (esqlQuery) => {
      expect(parseEsqlQuery(esqlQuery)).toEqual({
        errors: [],
        hasMetadataOperator: false,
        isEsqlQueryAggregating: false,
      });
    });

    it.each([
      ['from test* metadata _id'],
      ['from test* metadata _id, _index'],
      ['from test* metadata _index, _id'],
      ['from test*  metadata _id '],
      ['from test*    metadata _id '],
      ['from test*  metadata _id | limit 10'],
      [
        `from packetbeat* metadata

        _id
        | limit 100`,
      ],
    ])('detects existin METADATA operator in a NON aggregating query "%s"', (esqlQuery) =>
      expect(parseEsqlQuery(esqlQuery)).toEqual({
        errors: [],
        hasMetadataOperator: true,
        isEsqlQueryAggregating: false,
      })
    );

    it('detects missing METADATA operator in an aggregating query "from test* | stats c = count(*) by fieldA"', () =>
      expect(parseEsqlQuery('from test* | stats c = count(*) by fieldA')).toEqual({
        errors: [],
        hasMetadataOperator: false,
        isEsqlQueryAggregating: true,
      }));
  });

  describe('METADATA _id field for NON aggregating queries', () => {
    it('detects missing METADATA "_id" field', () => {
      expect(parseEsqlQuery('from test*')).toEqual({
        errors: [],
        hasMetadataOperator: false,
        isEsqlQueryAggregating: false,
      });
    });

    it('detects existing METADATA "_id" field', async () => {
      expect(parseEsqlQuery('from test* metadata _id')).toEqual({
        errors: [],
        hasMetadataOperator: true,
        isEsqlQueryAggregating: false,
      });
    });
  });

  describe('METADATA _id field for aggregating queries', () => {
    it('detects existing METADATA operator with missing "_id" field', () => {
      expect(
        parseEsqlQuery('from test* metadata someField | stats c = count(*) by fieldA')
      ).toEqual({ errors: [], hasMetadataOperator: false, isEsqlQueryAggregating: true });
    });
  });
});
