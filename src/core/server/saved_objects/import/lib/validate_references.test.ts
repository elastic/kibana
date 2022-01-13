/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ValidateReferencesParams } from './validate_references';
import { validateReferences } from './validate_references';
import { savedObjectsClientMock } from '../../../mocks';
import { SavedObjectsErrorHelpers } from '../../service';

function setup({
  objects = [],
  namespace,
  importStateMap = new Map(),
  retries,
}: Partial<Omit<ValidateReferencesParams, 'savedObjectsClient'>> = {}) {
  const savedObjectsClient = savedObjectsClientMock.create();
  return { objects, savedObjectsClient, namespace, importStateMap, retries };
}

function createNotFoundError({ type, id }: { type: string; id: string }) {
  const error = SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload;
  return { type, id, error, attributes: {}, references: [] };
}

describe('validateReferences()', () => {
  test('does not call cluster and returns empty when no objects are passed in', async () => {
    const params = setup();

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('returns errors when references are missing', async () => {
    const params = setup({
      objects: [
        {
          id: '1',
          type: 'visualization',
          attributes: {},
          references: [],
        },
        {
          id: '2',
          type: 'visualization',
          attributes: { title: 'My Visualization 2' },
          references: [{ name: 'ref_0', type: 'index-pattern', id: '3' }],
        },
        {
          id: '4',
          type: 'visualization',
          attributes: {},
          references: [
            { name: 'ref_0', type: 'index-pattern', id: '5' },
            { name: 'ref_1', type: 'index-pattern', id: '6' },
            { name: 'ref_2', type: 'search', id: '7' },
            { name: 'ref_3', type: 'search', id: '8' },
          ],
        },
      ],
    });
    params.savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        createNotFoundError({ type: 'index-pattern', id: '3' }),
        createNotFoundError({ type: 'index-pattern', id: '5' }),
        createNotFoundError({ type: 'index-pattern', id: '6' }),
        createNotFoundError({ type: 'search', id: '7' }),
        { id: '8', type: 'search', attributes: {}, references: [] },
      ],
    });

    const result = await validateReferences(params);
    expect(result).toEqual([
      expect.objectContaining({
        type: 'visualization',
        id: '2',
        error: {
          type: 'missing_references',
          references: [{ type: 'index-pattern', id: '3' }],
        },
      }),
      expect.objectContaining({
        type: 'visualization',
        id: '4',
        error: {
          type: 'missing_references',
          references: [
            { type: 'index-pattern', id: '5' },
            { type: 'index-pattern', id: '6' },
            { type: 'search', id: '7' },
          ],
        },
      }),
    ]);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [
        { type: 'index-pattern', id: '3', fields: ['id'] },
        { type: 'index-pattern', id: '5', fields: ['id'] },
        { type: 'index-pattern', id: '6', fields: ['id'] },
        { type: 'search', id: '7', fields: ['id'] },
        { type: 'search', id: '8', fields: ['id'] },
      ],
      { namespace: undefined }
    );
  });

  test(`skips checking references when ignoreMissingReferences is included in retry`, async () => {
    const params = setup({
      objects: [
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
        },
      ],
      retries: [
        {
          type: 'visualization',
          id: '2',
          overwrite: false,
          replaceReferences: [],
          ignoreMissingReferences: true,
        },
      ],
    });

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test(`doesn't return errors when references exist in Elasticsearch`, async () => {
    const params = setup({
      objects: [
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
        },
      ],
    });
    params.savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [{ id: '1', type: 'index-pattern', attributes: {}, references: [] }],
    });

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [{ type: 'index-pattern', id: '1', fields: ['id'] }],
      { namespace: undefined }
    );
  });

  test(`skips checking references that exist within the saved objects`, async () => {
    const params = setup({
      objects: [
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
        },
      ],
    });

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test(`skips checking references that are not part of ENFORCED_TYPES`, async () => {
    // this test case intentionally includes a mix of references that *will* be checked, and references that *won't* be checked
    const params = setup({
      objects: [
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [
            { name: 'ref_0', type: 'index-pattern', id: '1' },
            { name: 'ref_2', type: 'foo', id: '2' },
            { name: 'ref_1', type: 'search', id: '3' },
          ],
        },
      ],
    });
    params.savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        { type: 'index-pattern', id: '1', attributes: {}, references: [] },
        { type: 'search', id: '3', attributes: {}, references: [] },
      ],
    });

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(params.savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [
        { type: 'index-pattern', id: '1', fields: ['id'] },
        // foo:2 is not included in the cluster call
        { type: 'search', id: '3', fields: ['id'] },
      ],
      { namespace: undefined }
    );
  });

  test('skips checking references when an importStateMap entry indicates that we have already found an origin match with a different ID', async () => {
    const params = setup({
      objects: [
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
        },
      ],
      importStateMap: new Map([
        [`index-pattern:1`, { isOnlyReference: true, destinationId: 'not-1' }],
      ]),
    });

    const result = await validateReferences(params);
    expect(result).toEqual([]);
    expect(params.savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('throws when bulkGet encounters an unexpected error', async () => {
    const params = setup({
      objects: [
        {
          id: '2',
          type: 'visualization',
          attributes: {},
          references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
        },
      ],
    });
    params.savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          error: SavedObjectsErrorHelpers.createBadRequestError().output.payload,
          attributes: {},
          references: [],
        },
      ],
    });

    await expect(() => validateReferences(params)).rejects.toThrowError(
      'Error fetching references for imported objects'
    );
  });
});
