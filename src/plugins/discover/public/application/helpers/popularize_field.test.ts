/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IndexPattern, IndexPatternsService } from '../../../../data/public';
import { popularizeField } from './popularize_field';

describe('Popularize field', () => {
  test('returns undefined if index pattern lacks id', async () => {
    const indexPattern = ({} as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({} as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });

  test('returns undefined if field not found', async () => {
    const indexPattern = ({
      fields: {
        getByName: () => {},
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({} as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });

  test('returns undefined if successful', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = ({
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({
      updateSavedObject: async () => {},
    } as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
    expect(field.count).toEqual(1);
  });

  test('hides errors', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = ({
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown) as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = ({
      updateSavedObject: async () => {
        throw new Error('unknown error');
      },
    } as unknown) as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService);
    expect(result).toBeUndefined();
  });
});
