/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getNonExistingReferenceAsKeys, validateReferences } from './validate_references';
import { savedObjectsClientMock } from '../../../mocks';
import { SavedObjectsErrorHelpers } from '../../service';
import { ObjectKeyProvider } from './get_object_key';

describe('getNonExistingReferenceAsKeys()', () => {
  const namespace = 'foo-ns';

  let getObjKey: jest.MockedFunction<ObjectKeyProvider>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();

    getObjKey = jest.fn().mockImplementation(({ type, id }) => `${type}:${id}`);
    savedObjectsClient = savedObjectsClientMock.create();
  });

  test('returns empty response when no objects exist', async () => {
    const result = await getNonExistingReferenceAsKeys({
      savedObjects: [],
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test('skips objects when ignoreMissingReferences is included in retry', async () => {
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
      },
    ];
    const retries = [
      {
        type: 'visualization',
        id: '2',
        overwrite: false,
        replaceReferences: [],
        ignoreMissingReferences: true,
      },
    ];
    const result = await getNonExistingReferenceAsKeys({
      savedObjects,
      retries,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test('removes references that exist within savedObjects', async () => {
    const savedObjects = [
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
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    const result = await getNonExistingReferenceAsKeys({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test('removes references that exist within es', async () => {
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await getNonExistingReferenceAsKeys({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [
        {
          id: '1',
          type: 'index-pattern',
          fields: ['id'],
        },
      ],
      { namespace }
    );
  });

  test(`doesn't handle saved object types outside of ENFORCED_TYPES`, async () => {
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'foo',
            id: '1',
          },
        ],
      },
    ];
    const result = await getNonExistingReferenceAsKeys({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test('returns references within ENFORCED_TYPES when they are missing', async () => {
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
          {
            name: 'ref_1',
            type: 'search',
            id: '3',
          },
          {
            name: 'ref_2',
            type: 'foo',
            id: '4',
          },
        ],
      },
    ];
    savedObjectsClient.bulkGet.mockResolvedValueOnce({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', '1').output
            .payload,
          attributes: {},
          references: [],
        },
        {
          id: '3',
          type: 'search',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('search', '3').output.payload,
          attributes: {},
          references: [],
        },
      ],
    });
    const result = await getNonExistingReferenceAsKeys({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([`index-pattern:1`, `search:3`]);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [
        {
          type: 'index-pattern',
          id: '1',
          fields: ['id'],
        },
        {
          type: 'search',
          id: '3',
          fields: ['id'],
        },
      ],
      { namespace }
    );
  });
});

describe('validateReferences()', () => {
  const namespace = 'foo-ns';

  let getObjKey: jest.MockedFunction<ObjectKeyProvider>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();

    getObjKey = jest.fn().mockImplementation(({ type, id }) => `${type}:${id}`);
    savedObjectsClient = savedObjectsClientMock.create();
  });

  test('returns empty when no objects are passed in', async () => {
    const result = await validateReferences({
      savedObjects: [],
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test('returns errors when references are missing', async () => {
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          type: 'index-pattern',
          id: '3',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', '3').output
            .payload,
          attributes: {},
          references: [],
        },
        {
          type: 'index-pattern',
          id: '5',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', '5').output
            .payload,
          attributes: {},
          references: [],
        },
        {
          type: 'index-pattern',
          id: '6',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('index-pattern', '6').output
            .payload,
          attributes: {},
          references: [],
        },
        {
          type: 'search',
          id: '7',
          error: SavedObjectsErrorHelpers.createGenericNotFoundError('search', '7').output.payload,
          attributes: {},
          references: [],
        },
        {
          id: '8',
          type: 'search',
          attributes: {},
          references: [],
        },
      ],
    });

    const savedObjects = [
      {
        id: '1',
        type: 'visualization',
        attributes: {},
        references: [],
      },
      {
        id: '2',
        type: 'visualization',
        attributes: {
          title: 'My Visualization 2',
        },
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '3',
          },
        ],
      },
      {
        id: '4',
        type: 'visualization',
        attributes: {
          title: 'My Visualization 4',
        },
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '5',
          },
          {
            name: 'ref_1',
            type: 'index-pattern',
            id: '6',
          },
          {
            name: 'ref_2',
            type: 'search',
            id: '7',
          },
          {
            name: 'ref_3',
            type: 'search',
            id: '8',
          },
        ],
      },
    ];

    const result = await validateReferences({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([
      {
        type: 'visualization',
        id: '2',
        meta: {
          title: 'My Visualization 2',
        },
        title: 'My Visualization 2',
        error: {
          type: 'missing_references',
          references: [
            {
              id: '3',
              type: 'index-pattern',
            },
          ],
        },
      },
      {
        type: 'visualization',
        id: '4',
        meta: {
          title: 'My Visualization 4',
        },
        title: 'My Visualization 4',
        error: {
          type: 'missing_references',
          references: [
            {
              id: '5',
              type: 'index-pattern',
            },
            {
              id: '6',
              type: 'index-pattern',
            },
            {
              id: '7',
              type: 'search',
            },
          ],
        },
      },
    ]);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      [
        {
          id: '3',
          type: 'index-pattern',
          fields: ['id'],
        },
        {
          id: '5',
          type: 'index-pattern',
          fields: ['id'],
        },
        {
          id: '6',
          type: 'index-pattern',
          fields: ['id'],
        },
        {
          id: '7',
          type: 'search',
          fields: ['id'],
        },
        {
          id: '8',
          type: 'search',
          fields: ['id'],
        },
      ],
      { namespace }
    );
  });

  test(`doesn't return errors when ignoreMissingReferences is included in retry`, async () => {
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [{ name: 'ref_0', type: 'index-pattern', id: '1' }],
      },
    ];
    const retries = [
      {
        type: 'visualization',
        id: '2',
        overwrite: false,
        replaceReferences: [],
        ignoreMissingReferences: true,
      },
    ];
    const result = await validateReferences({
      savedObjects,
      retries,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).not.toHaveBeenCalled();
  });

  test(`doesn't return errors when references exist in Elasticsearch`, async () => {
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          id: '1',
          type: 'index-pattern',
          attributes: {},
          references: [],
        },
      ],
    });
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    const result = await validateReferences({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
  });

  test(`doesn't return errors when references exist within the saved objects`, async () => {
    const savedObjects = [
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
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    const result = await validateReferences({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test(`doesn't validate references on types not part of ENFORCED_TYPES`, async () => {
    const savedObjects = [
      {
        id: '1',
        type: 'dashboard',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'visualization',
            id: '2',
          },
          {
            name: 'ref_1',
            type: 'other-type',
            id: '3',
          },
        ],
      },
    ];
    const result = await validateReferences({
      savedObjects,
      savedObjectsClient,
      getObjKey,
      namespace,
    });
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(0);
  });

  test('throws when bulkGet fails', async () => {
    savedObjectsClient.bulkGet.mockResolvedValue({
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
    const savedObjects = [
      {
        id: '2',
        type: 'visualization',
        attributes: {},
        references: [
          {
            name: 'ref_0',
            type: 'index-pattern',
            id: '1',
          },
        ],
      },
    ];
    await expect(
      validateReferences({
        savedObjects,
        savedObjectsClient,
        getObjKey,
        namespace,
      })
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Error fetching references for imported objects"`
    );
  });
});
