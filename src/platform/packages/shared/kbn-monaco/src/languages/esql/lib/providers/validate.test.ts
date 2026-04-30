/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateQuery } from '@kbn/esql-language';
import { monaco } from '../../../../monaco_imports';
import { esqlValidate } from './validate';

jest.mock('@kbn/esql-language', () => ({
  validateQuery: jest.fn(),
}));

describe('esqlValidate', () => {
  const mockValidateQuery = validateQuery as jest.MockedFunction<typeof validateQuery>;

  describe('happy path', () => {
    it('returns validations wrapped as monaco messages', async () => {
      mockValidateQuery.mockResolvedValue({
        errors: [
          {
            type: 'error',
            text: 'Unknown index',
            code: 'test.error',
            location: { min: 0, max: 0 },
          },
        ],
        warnings: [],
      });

      const model = { isDisposed: () => false } as unknown as monaco.editor.ITextModel;

      const result = await esqlValidate(model, 'FROM a', undefined, undefined);

      expect(result).toEqual({
        errors: [
          {
            code: 'test.error',
            message: 'Unknown index',
            startColumn: 1,
            startLineNumber: 1,
            endColumn: 2,
            endLineNumber: 1,
            severity: monaco.MarkerSeverity.Error,
            _source: 'client',
          },
        ],
        warnings: [],
      });
      expect(mockValidateQuery).toHaveBeenCalledWith('FROM a', undefined, undefined);
    });
  });

  describe('disposed model', () => {
    it('returns empty errors and warnings and does not call the language service when no code is passed', async () => {
      mockValidateQuery.mockClear();

      const disposedModel = {
        getValue: jest.fn(),
        isDisposed: () => true,
      } as unknown as monaco.editor.ITextModel;

      const result = await esqlValidate(disposedModel, undefined, undefined, undefined);

      expect(result).toEqual({ errors: [], warnings: [] });
      expect(mockValidateQuery).not.toHaveBeenCalled();
      expect(disposedModel.getValue).not.toHaveBeenCalled();
    });
  });
});
