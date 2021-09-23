/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Capabilities } from 'kibana/public';
import { IndexPattern, IndexPatternsService } from '../../../../data/public';
import { popularizeField } from './popularize_field';

const capabilities = {
  indexPatterns: {
    save: true,
  },
} as unknown as Capabilities;

describe('Popularize field', () => {
  test('returns undefined if index pattern lacks id', async () => {
    const indexPattern = {} as unknown as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = {} as unknown as IndexPatternsService;
    const result = await popularizeField(
      indexPattern,
      fieldName,
      indexPatternsService,
      capabilities
    );
    expect(result).toBeUndefined();
  });

  test('returns undefined if field not found', async () => {
    const indexPattern = {
      fields: {
        getByName: () => {},
      },
    } as unknown as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = {} as unknown as IndexPatternsService;
    const result = await popularizeField(
      indexPattern,
      fieldName,
      indexPatternsService,
      capabilities
    );
    expect(result).toBeUndefined();
  });

  test('returns undefined if successful', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = {
      updateSavedObject: async () => {},
    } as unknown as IndexPatternsService;
    const result = await popularizeField(
      indexPattern,
      fieldName,
      indexPatternsService,
      capabilities
    );
    expect(result).toBeUndefined();
    expect(field.count).toEqual(1);
  });

  test('hides errors', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = {
      updateSavedObject: async () => {
        throw new Error('unknown error');
      },
    } as unknown as IndexPatternsService;
    const result = await popularizeField(
      indexPattern,
      fieldName,
      indexPatternsService,
      capabilities
    );
    expect(result).toBeUndefined();
  });

  test('should not try to update index pattern without permissions', async () => {
    const field = {
      count: 0,
    };
    const indexPattern = {
      id: 'id',
      fields: {
        getByName: () => field,
      },
    } as unknown as IndexPattern;
    const fieldName = '@timestamp';
    const indexPatternsService = {
      updateSavedObject: jest.fn(),
    } as unknown as IndexPatternsService;
    const result = await popularizeField(indexPattern, fieldName, indexPatternsService, {
      indexPatterns: { save: false },
    } as unknown as Capabilities);
    expect(result).toBeUndefined();
    expect(indexPatternsService.updateSavedObject).not.toHaveBeenCalled();
    expect(field.count).toEqual(0);
  });
});
