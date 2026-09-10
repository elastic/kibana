/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Setup } from './helpers';

export const runSubqueriesValidationSuite = (setup: Setup) => {
  describe('Subqueries Validation', () => {
    describe('FROM subqueries', () => {
      it('should validate commands inside subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index, (FROM other_index | KEEP missingField)', [
          'Unknown column "missingField"',
        ]);
      });

      it('should validate nested subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index, (FROM other_index, (FROM missingIndex))', [
          'Unknown index "missingIndex"',
        ]);
      });

      it('should validate multiple errors in subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index, (FROM other_index | KEEP keywordField, missingField1, missingField2)',
          ['Unknown column "missingField1"', 'Unknown column "missingField2"']
        );
      });

      it('should validate METADATA inside subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index, (FROM other_index METADATA _invalidField)', [
          'Metadata field "_invalidField" is not available. Available metadata fields are: [_version, _id, _index, _source, _ignored, _index_mode, _score]',
        ]);
      });

      it('should validate CCS indices inside subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index, (FROM remote-ccs:indexes)', [
          'Unknown index "remote-ccs:indexes"',
        ]);
        await expectErrors('FROM index, (FROM remote-*:indexes*)', []);
      });

      it('should validate custom command validation inside deeply nested subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index, (FROM other_index, (FROM a_index | RERANK "query" ON keywordField WITH {}))',
          ['"inference_id" parameter is required for RERANK.']
        );
      });

      it('validates time series functions against the FROM subquery source', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM (TS a_index | STATS col0 = AVG(AVG_OVER_TIME(doubleField)))', []);
      });
    });

    describe('WHERE IN subqueries', () => {
      it('accepts a valid IN subquery with no errors', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM other_index | KEEP keywordField)',
          []
        );
      });

      it('accepts keyword and text as compatible types', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM other_index | KEEP textField)',
          []
        );
      });

      it('accepts matching long types', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE longField IN (FROM other_index | KEEP longField)',
          []
        );
      });

      it('validates the types used by NOT IN', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField NOT IN (FROM other_index | KEEP integerField)',
          [
            'Left field [keywordField] of type [KEYWORD] is incompatible with right field [integerField] of type [INTEGER]',
          ]
        );
      });

      it('does not treat integer and long as compatible types', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE integerField IN (FROM other_index | KEEP longField)',
          [
            'Left field [integerField] of type [INTEGER] is incompatible with right field [longField] of type [LONG]',
          ]
        );
      });

      it('validates multi-column subquery cardinality', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (keywordField, integerField) IN (FROM other_index | KEEP keywordField)',
          ['The subquery must return 2 columns, but returned 1']
        );
      });

      it('validates a type mismatch in the second position of a tuple', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (keywordField, integerField) IN (FROM other_index | KEEP keywordField, longField)',
          [
            'Left field [integerField] of type [INTEGER] is incompatible with right field [longField] of type [LONG]',
          ]
        );
      });

      it('validates tuple types in the order returned by KEEP', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (keywordField, integerField) IN (FROM other_index | KEEP integerField, keywordField)',
          [
            'Left field [keywordField] of type [KEYWORD] is incompatible with right field [integerField] of type [INTEGER]',
            'Left field [integerField] of type [INTEGER] is incompatible with right field [keywordField] of type [KEYWORD]',
          ]
        );
      });

      it('validates unknown columns inside the left tuple', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (missingField, integerField) IN (FROM other_index | KEEP keywordField, integerField)',
          ['Unknown column "missingField"']
        );
      });

      it('validates functions inside the left tuple', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (keywordField, DOES_NOT_EXIST(integerField)) IN (FROM other_index | KEEP keywordField, integerField)',
          ['Unknown function DOES_NOT_EXIST']
        );
      });

      it('leaves unsupported fields to the existing field validation', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM unsupported_index | KEEP unsupported_field)',
          [],
          [
            'Field "unsupported_field" cannot be retrieved, it is unsupported or not indexed; returning null',
          ]
        );
      });

      it('does not report a type mismatch for conflicting columns', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM conflict_index | KEEP conflictingField)',
          [],
          ['Column [conflictingField] has conflicting types across indices: [text], [keyword]']
        );
      });

      it('does not report a type mismatch for query parameters', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE (??field, textField) IN (ROW col0 = 1, col1 = "other")',
          []
        );
      });

      it('does not make an extra column request without an IN subquery', async () => {
        const { callbacks, expectErrors } = await setup();
        const getColumnsFor = jest.fn(async () => []);

        await expectErrors(
          'ROW keywordField = "value" | WHERE keywordField IS NOT NULL',
          [],
          undefined,
          { ...callbacks, getColumnsFor }
        );

        expect(getColumnsFor).not.toHaveBeenCalled();
      });

      it('validates time series functions against the IN subquery source', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE 6.9 IN (TS a_index | STATS col0 = AVG(AVG_OVER_TIME(doubleField)) | KEEP col0)',
          []
        );

        await expectErrors(
          'TS a_index | WHERE 6.9 IN (FROM index | STATS col0 = AVG(AVG_OVER_TIME(doubleField)) | KEEP col0)',
          ['Function AVG_OVER_TIME not allowed in STATS']
        );
      });

      it('validates sources inside IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index | WHERE keywordField IN (FROM missing_index)', [
          'Unknown index "missing_index"',
        ]);
      });

      it('validates commands inside IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM other_index | KEEP missingField)',
          ['Unknown column "missingField"']
        );
      });

      it('validates nested IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM other_index | WHERE keywordField IN (FROM missing_index))',
          ['Unknown index "missing_index"']
        );
      });

      it('accepts nested multi-column IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          `FROM index
          | WHERE (keywordField, integerField) IN (
              FROM other_index
                | WHERE (integerField, keywordField) IN (
                    TS a_index | KEEP integerField, keywordField
                  )
                | KEEP keywordField, integerField
            )`,
          []
        );
      });

      it('validates tuple types in a nested multi-column IN subquery', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          `FROM index
            | WHERE (keywordField, integerField) IN (
                FROM other_index
                  | WHERE (integerField, keywordField) IN (
                      TS a_index | KEEP keywordField, integerField
                    )
                  | KEEP keywordField, integerField
              )`,
          [
            'Left field [integerField] of type [INTEGER] is incompatible with right field [keywordField] of type [KEYWORD]',
            'Left field [keywordField] of type [KEYWORD] is incompatible with right field [integerField] of type [INTEGER]',
          ]
        );
      });

      it('does not resolve outer query fields inside IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | EVAL outerField = keywordField | WHERE keywordField IN (FROM other_index | WHERE outerField IS NOT NULL | KEEP keywordField)',
          ['Unknown column "outerField"']
        );
      });

      it('validates multiple IN subqueries in the same WHERE expression', async () => {
        const { callbacks, expectErrors } = await setup();
        const query =
          'FROM kibana_sample_data_ecommerce | WHERE currency IN (FROM kibana_sample_dat_ecommerce | KEEP category) AND category.keyword IN (FROM kibana_sample_ata_logs | KEEP agent)';

        await expectErrors(
          query,
          ['Unknown index "kibana_sample_dat_ecommerce"', 'Unknown index "kibana_sample_ata_logs"'],
          undefined,
          {
            ...callbacks,
            getSources: jest.fn(async () => [
              {
                name: 'kibana_sample_data_ecommerce',
                hidden: false,
                type: 'Index',
              },
            ]),
            getColumnsFor: jest.fn(async () => [
              { name: 'currency', type: 'keyword', userDefined: false },
              { name: 'category.keyword', type: 'keyword', userDefined: false },
              { name: 'category', type: 'keyword', userDefined: false },
              { name: 'agent', type: 'keyword', userDefined: false },
            ]),
          }
        );
      });
    });

    describe('EVAL IN subqueries', () => {
      it('accepts a valid IN subquery with no errors', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | EVAL col0 = keywordField IN (FROM other_index | KEEP keywordField)',
          []
        );
      });

      it('validates sources inside IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index | EVAL col0 = keywordField IN (FROM missing_index)', [
          'Unknown index "missing_index"',
        ]);
      });
    });

    describe('STATS / INLINE STATS IN subqueries', () => {
      it('validates sources inside STATS IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | STATS COUNT(*) WHERE keywordField IN (FROM missing_index)',
          ['Unknown index "missing_index"']
        );
      });

      it('validates commands inside INLINE STATS IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | INLINE STATS COUNT(*) WHERE keywordField IN (FROM other_index | KEEP missingField)',
          ['Unknown column "missingField"']
        );
      });
    });
  });
};
