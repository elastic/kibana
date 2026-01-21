/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { setup } from './helpers';

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
});
