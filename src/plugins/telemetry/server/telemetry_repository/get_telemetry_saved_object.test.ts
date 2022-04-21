/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTelemetrySavedObject } from './get_telemetry_saved_object';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('getTelemetrySavedObject', () => {
  it('returns null when saved object not found', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectNotFound: true,
    });

    const result = await callGetTelemetrySavedObject(params);

    expect(result).toBe(null);
  });

  it('returns false when saved object forbidden', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectForbidden: true,
    });

    const result = await callGetTelemetrySavedObject(params);

    expect(result).toBe(false);
  });

  it('throws an error on unexpected saved object error', async () => {
    const params = getCallGetTelemetrySavedObjectParams({
      savedObjectOtherError: true,
    });

    let threw = false;
    try {
      await callGetTelemetrySavedObject(params);
    } catch (err) {
      threw = true;
      expect(err.message).toBe(SavedObjectOtherErrorMessage);
    }

    expect(threw).toBe(true);
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
