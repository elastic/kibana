/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTelemetrySavedObject } from './get_telemetry_saved_object';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('getTelemetrySavedObject', () => {
  it('returns {} when saved object not found', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectNotFound: true,
    });

    const result = await callGetTelemetrySavedObject(params);

    expect(result).toStrictEqual({});
  });

  it('throws when saved object forbidden', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectForbidden: true,
    });

    await expect(callGetTelemetrySavedObject(params)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"savedObjectForbidden"`
    );
  });

  it('throws an error on unexpected saved object error', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectOtherError: true,
    });

    await expect(callGetTelemetrySavedObject(params)).rejects.toThrow(SavedObjectOtherErrorMessage);
  });
});

interface CallGetTelemetrySavedObjectParams {
  savedObjectNotFound: boolean;
  savedObjectForbidden: boolean;
  savedObjectOtherError: boolean;
  result?: unknown;
}

const DefaultParams = {
  savedObjectNotFound: false,
  savedObjectForbidden: false,
  savedObjectOtherError: false,
};

function getCallGetTelemetrySavedObjectParams(
  overrides: Partial<CallGetTelemetrySavedObjectParams>
): CallGetTelemetrySavedObjectParams {
  return { ...DefaultParams, ...overrides };
}

async function callGetTelemetrySavedObject(params: CallGetTelemetrySavedObjectParams) {
  const savedObjectsClient = getMockSavedObjectsClient(params);
  return await getTelemetrySavedObject(savedObjectsClient);
}

const SavedObjectForbiddenMessage = 'savedObjectForbidden';
const SavedObjectOtherErrorMessage = 'savedObjectOtherError';

function getMockSavedObjectsClient(params: CallGetTelemetrySavedObjectParams) {
  const savedObjectsClient = savedObjectsClientMock.create();
  savedObjectsClient.get.mockImplementation(async (type, id) => {
    if (params.savedObjectNotFound) throw SavedObjectsErrorHelpers.createGenericNotFoundError();
    if (params.savedObjectForbidden)
      throw SavedObjectsErrorHelpers.decorateForbiddenError(new Error(SavedObjectForbiddenMessage));
    if (params.savedObjectOtherError)
      throw SavedObjectsErrorHelpers.decorateGeneralError(new Error(SavedObjectOtherErrorMessage));

    return { id, type, attributes: { enabled: null }, references: [] };
  });
  return savedObjectsClient;
}
