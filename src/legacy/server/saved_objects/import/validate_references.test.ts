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

import { validateReferences } from './validate_references';

describe('ensureReferencesExist()', () => {
  const savedObjectsClient = {
    errors: {} as any,
    bulkCreate: jest.fn(),
    bulkGet: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    get: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(() => {
    savedObjectsClient.bulkCreate.mockReset();
    savedObjectsClient.bulkGet.mockReset();
    savedObjectsClient.create.mockReset();
    savedObjectsClient.delete.mockReset();
    savedObjectsClient.find.mockReset();
    savedObjectsClient.get.mockReset();
    savedObjectsClient.update.mockReset();
  });

  test('returns empty when no objects are passed in', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
    });
    const result = await validateReferences([], savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [],
  "filteredObjects": Array [],
}
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test('returns errors when references are missing', async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
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
        attributes: {},
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
        attributes: {},
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
        ],
      },
    ];
    const result = await validateReferences(savedObjects, savedObjectsClient);
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [
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
        ],
        "type": "missing_references",
      },
      "id": "4",
      "type": "visualization",
    },
  ],
  "filteredObjects": Array [
    Object {
      "attributes": Object {},
      "id": "1",
      "references": Array [],
      "type": "visualization",
    },
  ],
}
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test(`doesn't return errors when references exist in Elasticsearch`, async () => {
    savedObjectsClient.find.mockResolvedValue({
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
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [],
  "filteredObjects": Array [
    Object {
      "attributes": Object {},
      "id": "2",
      "references": Array [
        Object {
          "id": "1",
          "name": "ref_0",
          "type": "index-pattern",
        },
      ],
      "type": "visualization",
    },
  ],
}
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });

  test(`doesn't return errors when references exist within the saved objects`, async () => {
    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
    });
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
    expect(result).toMatchInlineSnapshot(`
Object {
  "errors": Array [],
  "filteredObjects": Array [
    Object {
      "attributes": Object {},
      "id": "1",
      "references": Array [],
      "type": "index-pattern",
    },
    Object {
      "attributes": Object {},
      "id": "2",
      "references": Array [
        Object {
          "id": "1",
          "name": "ref_0",
          "type": "index-pattern",
        },
      ],
      "type": "visualization",
    },
  ],
}
`);
    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
  });
});
