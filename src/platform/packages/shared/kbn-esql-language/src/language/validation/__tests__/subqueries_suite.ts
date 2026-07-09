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
    });

    describe('WHERE IN subqueries', () => {
      it('accepts a valid IN subquery with no errors', async () => {
        const { expectErrors } = await setup();

        await expectErrors(
          'FROM index | WHERE keywordField IN (FROM other_index | KEEP keywordField)',
          []
        );
      });

      it('validates sources inside IN subqueries', async () => {
        const { expectErrors } = await setup();

        await expectErrors('FROM index | WHERE keywordField IN (FROM missing_index)', [
          'Unknown index "missing_index"',
        ]);
      });

      it.each(['IN', 'NOT IN'])('validates commands inside %s subqueries', async (operator) => {
        const { expectErrors } = await setup();

        await expectErrors(
          `FROM index | WHERE keywordField ${operator} (FROM other_index | KEEP missingField)`,
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
  });
};
