/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import type { SavedObjectsCreateOptions } from '@kbn/core/public';
import { saveWithConfirmation } from './save_with_confirmation';
import { VisSavedObject } from '../../types';
import * as deps from './confirm_modal_promise';
import { OVERWRITE_REJECTED } from './constants';
import { VisualizationSavedObjectAttributes } from '../../../common';

const coreStart = coreMock.createStart();
const mockFindContent = jest.fn(() => ({
  pagination: { total: 0 },
  hits: [],
}));
const mockGetContent = jest.fn(() => ({
  item: {
    id: 'test',
    references: [
      {
        id: 'test',
        type: 'index-pattern',
      },
    ],
    attributes: {
      visState: JSON.stringify({ type: 'area' }),
      kibanaSavedObjectMeta: {
        searchSourceJSON: '{filter: []}',
      },
    },
    _version: '1',
  },
  meta: {
    outcome: 'exact',
    alias_target_id: null,
  },
}));
const mockCreateContent = jest.fn(async (_input: any) => ({
  item: {
    id: 'test',
  },
}));

const mockUpdateContent = jest.fn(() => ({
  item: {
    id: 'test',
  },
}));

jest.mock('../../services', () => ({
  getContentManagement: jest.fn(() => ({
    client: {
      create: mockCreateContent,
      update: mockUpdateContent,
      get: mockGetContent,
      search: mockFindContent,
    },
  })),
}));

describe('saveWithConfirmation', () => {
  const source: VisualizationSavedObjectAttributes = {} as VisualizationSavedObjectAttributes;
  const options: SavedObjectsCreateOptions = {} as SavedObjectsCreateOptions;
  const savedObject = {
    getEsType: () => 'visualization',
    title: 'test title',
    displayName: 'test display name',
  } as VisSavedObject;

  beforeEach(() => {
    mockCreateContent.mockClear();
    jest.spyOn(deps, 'confirmModalPromise').mockReturnValue(Promise.resolve({} as any));
  });

  test('should call create of savedObjectsClient', async () => {
    await saveWithConfirmation(source, savedObject, options, coreStart);
    expect(mockCreateContent).toHaveBeenCalledWith({
      contentTypeId: savedObject.getEsType(),
      data: source,
      options,
    });
  });

  test('should call confirmModalPromise when such record exists', async () => {
    mockCreateContent.mockImplementation((input) =>
      input?.options?.overwrite
        ? Promise.resolve({} as any)
        : Promise.reject({ res: { status: 409 } })
    );

    await saveWithConfirmation(source, savedObject, options, coreStart);
    expect(deps.confirmModalPromise).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.objectContaining(coreStart)
    );
  });

  test('should call create of savedObjectsClient when overwriting confirmed', async () => {
    mockCreateContent.mockImplementation((input) =>
      input?.options?.overwrite
        ? Promise.resolve({} as any)
        : Promise.reject({ res: { status: 409 } })
    );

    await saveWithConfirmation(source, savedObject, options, coreStart);
    expect(mockCreateContent).toHaveBeenLastCalledWith({
      contentTypeId: savedObject.getEsType(),
      data: source,
      options: {
        overwrite: true,
        ...options,
      },
    });
  });

  test('should reject when overwriting denied', async () => {
    mockCreateContent.mockReturnValue(Promise.reject({ res: { status: 409 } }));
    jest.spyOn(deps, 'confirmModalPromise').mockReturnValue(Promise.reject());

    expect.assertions(1);
    await expect(saveWithConfirmation(source, savedObject, options, coreStart)).rejects.toThrow(
      OVERWRITE_REJECTED
    );
  });
});
