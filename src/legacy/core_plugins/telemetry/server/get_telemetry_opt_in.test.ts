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

import { getTelemetryOptIn } from './get_telemetry_opt_in';

describe('get_telemetry_opt_in', () => {
  it('returns false when request path is not /app*', async () => {
    const params = getCallGetTelemetryOptInParams({
      requestPath: '/foo/bar',
    });

    const result = await callGetTelemetryOptIn(params);

    expect(result).toBe(false);
  });

  it('returns null when saved object not found', async () => {
    const params = getCallGetTelemetryOptInParams({
      savedObjectNotFound: true,
    });

    const result = await callGetTelemetryOptIn(params);

    expect(result).toBe(null);
  });

  it('returns false when saved object forbidden', async () => {
    const params = getCallGetTelemetryOptInParams({
      savedObjectForbidden: true,
    });

    const result = await callGetTelemetryOptIn(params);

    expect(result).toBe(false);
  });

  it('throws an error on unexpected saved object error', async () => {
    const params = getCallGetTelemetryOptInParams({
      savedObjectOtherError: true,
    });

    let threw = false;
    try {
      await callGetTelemetryOptIn(params);
    } catch (err) {
      threw = true;
      expect(err.message).toBe(SavedObjectOtherErrorMessage);
    }

    expect(threw).toBe(true);
  });

  it('returns null if enabled is null or undefined', async () => {
    for (const enabled of [null, undefined]) {
      const params = getCallGetTelemetryOptInParams({
        enabled,
      });

      const result = await callGetTelemetryOptIn(params);

      expect(result).toBe(null);
    }
  });

  it('returns true when enabled is true', async () => {
    const params = getCallGetTelemetryOptInParams({
      enabled: true,
    });

    const result = await callGetTelemetryOptIn(params);

    expect(result).toBe(true);
  });

  // build a table of tests with version checks, with results for enabled false
  type VersionCheckTable = Array<Partial<CallGetTelemetryOptInParams>>;

  const EnabledFalseVersionChecks: VersionCheckTable = [
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '8.0.0', result: false },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '8.0.1', result: false },
    { lastVersionChecked: '8.0.1', currentKibanaVersion: '8.0.0', result: false },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '8.1.0', result: null },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '9.0.0', result: null },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '7.0.0', result: false },
    { lastVersionChecked: '8.1.0', currentKibanaVersion: '8.0.0', result: false },
    { lastVersionChecked: '8.0.0-X', currentKibanaVersion: '8.0.0', result: false },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: '8.0.0-X', result: false },
    { lastVersionChecked: null, currentKibanaVersion: '8.0.0', result: null },
    { lastVersionChecked: undefined, currentKibanaVersion: '8.0.0', result: null },
    { lastVersionChecked: 5, currentKibanaVersion: '8.0.0', result: null },
    { lastVersionChecked: '8.0.0', currentKibanaVersion: 'beta', result: null },
    { lastVersionChecked: 'beta', currentKibanaVersion: '8.0.0', result: null },
    { lastVersionChecked: 'beta', currentKibanaVersion: 'beta', result: false },
    { lastVersionChecked: 'BETA', currentKibanaVersion: 'beta', result: null },
  ].map(el => ({ ...el, enabled: false }));

  // build a table of tests with version checks, with results for enabled true/null/undefined
  const EnabledTrueVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map(el => ({
    ...el,
    enabled: true,
    result: true,
  }));

  const EnabledNullVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map(el => ({
    ...el,
    enabled: null,
    result: null,
  }));

  const EnabledUndefinedVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map(el => ({
    ...el,
    enabled: undefined,
    result: null,
  }));

  const AllVersionChecks = [
    ...EnabledFalseVersionChecks,
    ...EnabledTrueVersionChecks,
    ...EnabledNullVersionChecks,
    ...EnabledUndefinedVersionChecks,
  ];

  test.each(AllVersionChecks)(
    'returns expected result for version check with %j',
    async (params: Partial<CallGetTelemetryOptInParams>) => {
      const result = await callGetTelemetryOptIn({ ...DefaultParams, ...params });
      expect(result).toBe(params.result);
    }
  );
});

interface CallGetTelemetryOptInParams {
  requestPath: string;
  savedObjectNotFound: boolean;
  savedObjectForbidden: boolean;
  savedObjectOtherError: boolean;
  enabled: boolean | null | undefined;
  lastVersionChecked?: any; // should be a string, but test with non-strings
  currentKibanaVersion: string;
  result?: boolean | null;
}

const DefaultParams = {
  requestPath: '/app/something',
  savedObjectNotFound: false,
  savedObjectForbidden: false,
  savedObjectOtherError: false,
  enabled: true,
  lastVersionChecked: '8.0.0',
  currentKibanaVersion: '8.0.0',
};

function getCallGetTelemetryOptInParams(
  overrides: Partial<CallGetTelemetryOptInParams>
): CallGetTelemetryOptInParams {
  return { ...DefaultParams, ...overrides };
}

async function callGetTelemetryOptIn(params: CallGetTelemetryOptInParams): Promise<boolean | null> {
  const { currentKibanaVersion } = params;
  const request = getMockRequest(params);
  return await getTelemetryOptIn({ request, currentKibanaVersion });
}

function getMockRequest(params: CallGetTelemetryOptInParams): any {
  return {
    path: params.requestPath,
    getSavedObjectsClient() {
      return getMockSavedObjectsClient(params);
    },
  };
}

const SavedObjectNotFoundMessage = 'savedObjectNotFound';
const SavedObjectForbiddenMessage = 'savedObjectForbidden';
const SavedObjectOtherErrorMessage = 'savedObjectOtherError';

function getMockSavedObjectsClient(params: CallGetTelemetryOptInParams) {
  return {
    async get(type: string, id: string) {
      if (params.savedObjectNotFound) throw new Error(SavedObjectNotFoundMessage);
      if (params.savedObjectForbidden) throw new Error(SavedObjectForbiddenMessage);
      if (params.savedObjectOtherError) throw new Error(SavedObjectOtherErrorMessage);

      const enabled = params.enabled;
      const lastVersionChecked = params.lastVersionChecked;
      return { attributes: { enabled, lastVersionChecked } };
    },
    errors: {
      isNotFoundError(error: any) {
        return error.message === SavedObjectNotFoundMessage;
      },
      isForbiddenError(error: any) {
        return error.message === SavedObjectForbiddenMessage;
      },
    },
  };
}
