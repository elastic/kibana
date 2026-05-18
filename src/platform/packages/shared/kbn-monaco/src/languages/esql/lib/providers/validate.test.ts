/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from '../../../../monaco_imports';
import { createDisposedTextModel, createIndexSource, createTextModel } from './test_helpers';
import { esqlValidate } from './validate';

describe('esqlValidate', () => {
  describe('happy path', () => {
    it('returns validations wrapped as monaco messages', async () => {
      const callbacks = {
        getSources: jest.fn(async () => [createIndexSource('logs')]),
      };

      const model = createTextModel({ value: 'FROM missing' });

      const result = await esqlValidate(model, 'FROM missing', callbacks, undefined);

      expect(result).toEqual({
        errors: [
          {
            code: 'unknownDataSource',
            message: 'Unknown data source "missing"',
            startColumn: 6,
            startLineNumber: 1,
            endColumn: 13,
            endLineNumber: 1,
            severity: monaco.MarkerSeverity.Error,
            _source: 'client',
          },
        ],
        warnings: [],
      });
    });
  });

  describe('disposed model', () => {
    it('returns empty errors and warnings without accessing the model value', async () => {
      const disposedModel = createDisposedTextModel();

      const result = await esqlValidate(disposedModel);

      expect(result).toEqual({ errors: [], warnings: [] });
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
