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

import { SavedObjectsImportUnknownError } from 'src/core/public';
import { httpServiceMock } from '../../../../core/public/mocks';
import { resolveImportErrors } from './resolve_import_errors';

function getFormData(form: Map<string, any>) {
  const formData: Record<string, any> = {};
  for (const [key, val] of form.entries()) {
    if (key === 'retries') {
      formData[key] = JSON.parse(val);
      continue;
    }
    formData[key] = val;
  }
  return formData;
}

describe('resolveImportErrors', () => {
  const getConflictResolutions = jest.fn();
  let httpMock: ReturnType<typeof httpServiceMock.createSetupContract>;

  beforeEach(() => {
    httpMock = httpServiceMock.createSetupContract();
    jest.resetAllMocks();
  });

  const extractBodyFromCall = (index: number): Map<string, any> => {
    return (httpMock.post.mock.calls[index] as any)[1].body;
  };

  test('works with empty import failures', async () => {
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [],
  "importCount": 0,
  "status": "success",
}
`);
  });

  test(`doesn't retry if only unknown failures are passed in`, async () => {
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
        failedImports: [
          {
            obj: {
              type: 'a',
              id: '1',
            },
            error: {
              type: 'unknown',
            } as SavedObjectsImportUnknownError,
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [
    Object {
      "error": Object {
        "type": "unknown",
      },
      "obj": Object {
        "id": "1",
        "type": "a",
      },
    },
  ],
  "importCount": 0,
  "status": "success",
}
`);
  });

  test('resolves conflicts', async () => {
    httpMock.post.mockResolvedValueOnce({
      success: true,
      successCount: 1,
    });
    getConflictResolutions.mockReturnValueOnce({
      'a:1': true,
      'a:2': false,
    });
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
        failedImports: [
          {
            obj: {
              type: 'a',
              id: '1',
            },
            error: {
              type: 'conflict',
            },
          },
          {
            obj: {
              type: 'a',
              id: '2',
            },
            error: {
              type: 'conflict',
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [],
  "importCount": 1,
  "status": "success",
}
`);

    const formData = getFormData(extractBodyFromCall(0));
    expect(formData).toMatchInlineSnapshot(`
Object {
  "file": "undefined",
  "retries": Array [
    Object {
      "id": "1",
      "overwrite": true,
      "replaceReferences": Array [],
      "type": "a",
    },
  ],
}
`);
  });

  test('resolves missing references', async () => {
    httpMock.post.mockResolvedValueOnce({
      success: true,
      successCount: 2,
    });
    getConflictResolutions.mockResolvedValueOnce({});
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
        unmatchedReferences: [
          {
            existingIndexPatternId: '2',
            newIndexPatternId: '3',
          },
        ],
        failedImports: [
          {
            obj: {
              type: 'a',
              id: '1',
            },
            error: {
              type: 'missing_references',
              references: [
                {
                  type: 'index-pattern',
                  id: '2',
                },
              ],
              blocking: [
                {
                  type: 'a',
                  id: '2',
                },
              ],
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [],
  "importCount": 2,
  "status": "success",
}
`);
    const formData = getFormData(extractBodyFromCall(0));
    expect(formData).toMatchInlineSnapshot(`
Object {
  "file": "undefined",
  "retries": Array [
    Object {
      "id": "1",
      "overwrite": false,
      "replaceReferences": Array [
        Object {
          "from": "2",
          "to": "3",
          "type": "index-pattern",
        },
      ],
      "type": "a",
    },
    Object {
      "id": "2",
      "type": "a",
    },
  ],
}
`);
  });

  test(`doesn't resolve missing references if newIndexPatternId isn't defined`, async () => {
    getConflictResolutions.mockResolvedValueOnce({});
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
        unmatchedReferences: [
          {
            existingIndexPatternId: '2',
            newIndexPatternId: undefined,
          },
        ],
        failedImports: [
          {
            obj: {
              type: 'a',
              id: '1',
            },
            error: {
              type: 'missing_references',
              references: [
                {
                  type: 'index-pattern',
                  id: '2',
                },
              ],
              blocking: [
                {
                  type: 'a',
                  id: '2',
                },
              ],
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [],
  "importCount": 0,
  "status": "success",
}
`);
  });

  test('handles missing references then conflicts on the same errored objects', async () => {
    httpMock.post.mockResolvedValueOnce({
      success: false,
      successCount: 0,
      errors: [
        {
          type: 'a',
          id: '1',
          error: {
            type: 'conflict',
          },
        },
      ],
    });
    httpMock.post.mockResolvedValueOnce({
      success: true,
      successCount: 1,
    });
    getConflictResolutions.mockResolvedValueOnce({});
    getConflictResolutions.mockResolvedValueOnce({
      'a:1': true,
    });
    const result = await resolveImportErrors({
      http: httpMock,
      getConflictResolutions,
      state: {
        importCount: 0,
        unmatchedReferences: [
          {
            existingIndexPatternId: '2',
            newIndexPatternId: '3',
          },
        ],
        failedImports: [
          {
            obj: {
              type: 'a',
              id: '1',
            },
            error: {
              type: 'missing_references',
              references: [
                {
                  type: 'index-pattern',
                  id: '2',
                },
              ],
              blocking: [],
            },
          },
        ],
      },
    });
    expect(result).toMatchInlineSnapshot(`
Object {
  "failedImports": Array [],
  "importCount": 1,
  "status": "success",
}
`);
    const formData1 = getFormData(extractBodyFromCall(0));
    expect(formData1).toMatchInlineSnapshot(`
Object {
  "file": "undefined",
  "retries": Array [
    Object {
      "id": "1",
      "overwrite": false,
      "replaceReferences": Array [
        Object {
          "from": "2",
          "to": "3",
          "type": "index-pattern",
        },
      ],
      "type": "a",
    },
  ],
}
`);
    const formData2 = getFormData(extractBodyFromCall(1));
    expect(formData2).toMatchInlineSnapshot(`
Object {
  "file": "undefined",
  "retries": Array [
    Object {
      "id": "1",
      "overwrite": true,
      "replaceReferences": Array [
        Object {
          "from": "2",
          "to": "3",
          "type": "index-pattern",
        },
      ],
      "type": "a",
    },
  ],
}
`);
  });
});
