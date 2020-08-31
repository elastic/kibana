/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { getNonExistingReferenceAsKeys, validateReferences } from './validate_references';
import { savedObjectsClientMock } from '../../mocks';
import { SavedObjectsErrorHelpers } from '..';

describe('getNonExistingReferenceAsKeys()', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns empty response when no objects exist', async () => {
    const result = await getNonExistingReferenceAsKeys([], savedObjectsClient);
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
    const result = await getNonExistingReferenceAsKeys(
      savedObjects,
      savedObjectsClient,
      undefined,
      retries
    );
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
    const result = await getNonExistingReferenceAsKeys(savedObjects, savedObjectsClient);
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
    const result = await getNonExistingReferenceAsKeys(savedObjects, savedObjectsClient);
    expect(result).toEqual([]);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "1",
                "type": "index-pattern",
              },
            ],
            Object {
              "namespace": undefined,
            },
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Promise {},
          },
        ],
      }
    `);
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
    const result = await getNonExistingReferenceAsKeys(savedObjects, savedObjectsClient);
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
    const result = await getNonExistingReferenceAsKeys(savedObjects, savedObjectsClient);
    expect(result).toEqual(['index-pattern:1', 'search:3']);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "1",
                "type": "index-pattern",
              },
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "3",
                "type": "search",
              },
            ],
            Object {
              "namespace": undefined,
            },
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Promise {},
          },
        ],
      }
    `);
  });
});

describe('validateReferences()', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('returns empty when no objects are passed in', async () => {
    const result = await validateReferences([], savedObjectsClient);
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
    const result = await validateReferences(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "error": Object {
            "references": Array [
              Object {
                "id": "3",
                "type": "index-pattern",
              },
            ],
            "type": "missing_references",
          },
          "id": "2",
          "meta": Object {
            "title": "My Visualization 2",
          },
          "title": "My Visualization 2",
          "type": "visualization",
        },
        Object {
          "error": Object {
            "references": Array [
              Object {
                "id": "5",
                "type": "index-pattern",
              },
              Object {
                "id": "6",
                "type": "index-pattern",
              },
              Object {
                "id": "7",
                "type": "search",
              },
            ],
            "type": "missing_references",
          },
          "id": "4",
          "meta": Object {
            "title": "My Visualization 4",
          },
          "title": "My Visualization 4",
          "type": "visualization",
        },
      ]
    `);
    expect(savedObjectsClient.bulkGet).toMatchInlineSnapshot(`
      [MockFunction] {
        "calls": Array [
          Array [
            Array [
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "3",
                "type": "index-pattern",
              },
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "5",
                "type": "index-pattern",
              },
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "6",
                "type": "index-pattern",
              },
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "7",
                "type": "search",
              },
              Object {
                "fields": Array [
                  "id",
                ],
                "id": "8",
                "type": "search",
              },
            ],
            Object {
              "namespace": undefined,
            },
          ],
        ],
        "results": Array [
          Object {
            "type": "return",
            "value": Promise {},
          },
        ],
      }
    `);
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
    const result = await validateReferences(savedObjects, savedObjectsClient, undefined, retries);
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
    const result = await validateReferences(savedObjects, savedObjectsClient);
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
    const result = await validateReferences(savedObjects, savedObjectsClient);
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
    const result = await validateReferences(savedObjects, savedObjectsClient);
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
      validateReferences(savedObjects, savedObjectsClient)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Bad Request"`);
  });
});
