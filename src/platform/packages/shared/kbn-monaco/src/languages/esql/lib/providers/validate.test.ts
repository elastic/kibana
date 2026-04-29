/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateQuery } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';
import { esqlValidate } from './validate';

jest.mock('@kbn/esql-language', () => ({
  validateQuery: jest.fn(),
}));

describe('esqlValidate', () => {
  const mockValidateQuery = validateQuery as jest.MockedFunction<typeof validateQuery>;

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
