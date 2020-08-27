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

import { mockUuidv4 } from './__mocks__';
import { savedObjectsClientMock } from '../../mocks';
import { SavedObjectReference, SavedObjectsImportRetry } from 'kibana/public';
import { SavedObjectsClientContract, SavedObject } from '../types';
import { SavedObjectsErrorHelpers } from '..';
import { checkConflicts } from './check_conflicts';

type SavedObjectType = SavedObject<{ title?: string }>;
type CheckConflictsParams = Parameters<typeof checkConflicts>[0];

/**
 * Function to create a realistic-looking import object given a type and ID
 */
const createObject = (type: string, id: string): SavedObjectType => ({
  type,
  id,
  attributes: { title: 'some-title' },
  references: (Symbol() as unknown) as SavedObjectReference[],
});

const getResultMock = {
  conflict: (type: string, id: string) => {
    const error = SavedObjectsErrorHelpers.createConflictError(type, id).output.payload;
    return { type, id, error };
  },
  unresolvableConflict: (type: string, id: string) => {
    const conflictMock = getResultMock.conflict(type, id);
    const metadata = { isNotOverwritable: true };
    return { ...conflictMock, error: { ...conflictMock.error, metadata } };
  },
  invalidType: (type: string, id: string) => {
    const error = SavedObjectsErrorHelpers.createUnsupportedTypeError(type).output.payload;
    return { type, id, error };
  },
};

/**
 * Create a variety of different objects to exercise different import / result scenarios
 */
const obj1 = createObject('type-1', 'id-1'); // -> success
const obj2 = createObject('type-2', 'id-2'); // -> conflict
const obj3 = createObject('type-3', 'id-3'); // -> unresolvable conflict
const obj4 = createObject('type-4', 'id-4'); // -> invalid type
const objects = [obj1, obj2, obj3, obj4];
const obj2Error = getResultMock.conflict(obj2.type, obj2.id);
const obj3Error = getResultMock.unresolvableConflict(obj3.type, obj3.id);
const obj4Error = getResultMock.invalidType(obj4.type, obj4.id);

describe('#checkConflicts', () => {
  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let socCheckConflicts: typeof savedObjectsClient['checkConflicts'];

  const setupParams = (partial: {
    objects: SavedObjectType[];
    namespace?: string;
    ignoreRegularConflicts?: boolean;
    retries?: SavedObjectsImportRetry[];
    createNewCopies?: boolean;
  }): CheckConflictsParams => {
    savedObjectsClient = savedObjectsClientMock.create();
    socCheckConflicts = savedObjectsClient.checkConflicts;
    socCheckConflicts.mockResolvedValue({ errors: [] }); // by default, mock to empty results
    return { ...partial, savedObjectsClient };
  };

  beforeEach(() => {
    mockUuidv4.mockReset();
    mockUuidv4.mockReturnValueOnce(`new-object-id`);
  });

  it('exits early if there are no objects to check', async () => {
    const namespace = 'foo-namespace';
    const params = setupParams({ objects: [], namespace });

    const checkConflictsResult = await checkConflicts(params);
    expect(socCheckConflicts).not.toHaveBeenCalled();
    expect(checkConflictsResult).toEqual({
      filteredObjects: [],
      errors: [],
      importIdMap: new Map(),
      pendingOverwrites: new Set(),
    });
  });

  it('calls checkConflicts with expected inputs', async () => {
    const namespace = 'foo-namespace';
    const params = setupParams({ objects, namespace });

    await checkConflicts(params);
    expect(socCheckConflicts).toHaveBeenCalledTimes(1);
    expect(socCheckConflicts).toHaveBeenCalledWith(objects, { namespace });
  });

  it('returns expected result', async () => {
    const namespace = 'foo-namespace';
    const params = setupParams({ objects, namespace });
    socCheckConflicts.mockResolvedValue({ errors: [obj2Error, obj3Error, obj4Error] });

    const checkConflictsResult = await checkConflicts(params);
    expect(checkConflictsResult).toEqual({
      filteredObjects: [obj1, obj3],
      errors: [
        {
          ...obj2Error,
          title: obj2.attributes.title,
          meta: { title: obj2.attributes.title },
          error: { type: 'conflict' },
        },
        {
          ...obj4Error,
          title: obj4.attributes.title,
          meta: { title: obj4.attributes.title },
          error: { ...obj4Error.error, type: 'unknown' },
        },
      ],
      importIdMap: new Map([[`${obj3.type}:${obj3.id}`, { id: `new-object-id` }]]),
      pendingOverwrites: new Set(),
    });
  });

  it('does not return errors for regular conflicts when ignoreRegularConflicts=true', async () => {
    const namespace = 'foo-namespace';
    const params = setupParams({ objects, namespace, ignoreRegularConflicts: true });
    socCheckConflicts.mockResolvedValue({ errors: [obj2Error, obj3Error, obj4Error] });

    const checkConflictsResult = await checkConflicts(params);
    expect(checkConflictsResult).toEqual(
      expect.objectContaining({
        filteredObjects: [obj1, obj2, obj3],
        errors: [
          {
            ...obj4Error,
            title: obj4.attributes.title,
            meta: { title: obj4.attributes.title },
            error: { ...obj4Error.error, type: 'unknown' },
          },
        ],
        pendingOverwrites: new Set([`${obj2.type}:${obj2.id}`]),
      })
    );
  });

  it('handles retries', async () => {
    const namespace = 'foo-namespace';
    const obj5 = createObject('type-5', 'id-5');
    const _objects = [...objects, obj5];
    const retries = [
      { id: obj1.id, type: obj1.type }, // find no conflict for obj1
      { id: obj2.id, type: obj2.type, destinationId: 'some-object-id' }, // find a conflict for obj2, and return it with the specified destinationId
      { id: obj3.id, type: obj3.type, destinationId: 'another-object-id', createNewCopy: true }, // find an unresolvable conflict for obj3, regenerate the destinationId, and then omit originId because of the createNewCopy flag
      { id: obj4.id, type: obj4.type }, // get an unknown error for obj4
      { id: obj5.id, type: obj5.type, overwrite: true }, // find a conflict for obj5, but ignore it because of the overwrite flag
    ] as SavedObjectsImportRetry[];
    const params = setupParams({ objects: _objects, namespace, retries });
    const obj5Error = getResultMock.conflict(obj5.type, obj5.id);
    socCheckConflicts.mockResolvedValue({
      errors: [
        { ...obj2Error, id: 'some-object-id' },
        { ...obj3Error, id: 'another-object-id' },
        obj4Error,
        obj5Error,
      ],
    });

    const checkConflictsResult = await checkConflicts(params);
    expect(checkConflictsResult).toEqual({
      filteredObjects: [obj1, obj3, obj5],
      errors: [
        {
          ...obj2Error,
          title: obj2.attributes.title,
          meta: { title: obj2.attributes.title },
          error: { type: 'conflict', destinationId: 'some-object-id' },
        },
        {
          ...obj4Error,
          title: obj4.attributes.title,
          meta: { title: obj4.attributes.title },
          error: { ...obj4Error.error, type: 'unknown' },
        },
      ],
      importIdMap: new Map([
        [`${obj3.type}:${obj3.id}`, { id: `new-object-id`, omitOriginId: true }],
      ]),
      pendingOverwrites: new Set([`${obj5.type}:${obj5.id}`]),
    });
  });

  it('adds `omitOriginId` field to `importIdMap` entries when createNewCopies=true', async () => {
    const namespace = 'foo-namespace';
    const params = setupParams({ objects, namespace, createNewCopies: true });
    socCheckConflicts.mockResolvedValue({ errors: [obj2Error, obj3Error, obj4Error] });

    const checkConflictsResult = await checkConflicts(params);
    expect(checkConflictsResult).toEqual(
      expect.objectContaining({
        importIdMap: new Map([
          [`${obj3.type}:${obj3.id}`, { id: `new-object-id`, omitOriginId: true }],
        ]),
      })
    );
  });
});
