/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTelemetryOptIn } from './get_telemetry_opt_in';
import type { TelemetrySavedObject } from '../saved_objects';

describe('getTelemetryOptIn', () => {
  it('returns null when saved object not found', () => {
    const params = getCallGetTelemetryOptInParams({
      savedObjectNotFound: true,
    });

    const result = callGetTelemetryOptIn(params);

    expect(result).toBe(null);
  });

  it('returns null if enabled is null or undefined', () => {
    for (const enabled of [null, undefined]) {
      const params = getCallGetTelemetryOptInParams({
        enabled,
      });

      const result = callGetTelemetryOptIn(params);

      expect(result).toBe(null);
    }
  });

  it('returns true when enabled is true', () => {
    const params = getCallGetTelemetryOptInParams({
      enabled: true,
    });

    const result = callGetTelemetryOptIn(params);

    expect(result).toBe(true);
  });

  // build a table of tests with version checks, with results for enabled false
  type VersionCheckTable = Array<Partial<CallGetTelemetryOptInParams>>;

  // @ts-expect-error the test is intentionally testing malformed objects
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
  ].map((el) => ({ ...el, enabled: false }));

  // build a table of tests with version checks, with results for enabled true/null/undefined
  const EnabledTrueVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map((el) => ({
    ...el,
    enabled: true,
    result: true,
  }));

  const EnabledNullVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map((el) => ({
    ...el,
    enabled: null,
    result: null,
  }));

  const EnabledUndefinedVersionChecks: VersionCheckTable = EnabledFalseVersionChecks.map((el) => ({
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
  savedObjectNotFound: boolean;
  lastVersionChecked?: string; // should be a string, but test with non-strings
  currentKibanaVersion: string;
  result?: boolean | null;
  enabled: boolean | null | undefined;
  configTelemetryOptIn: boolean | null;
  allowChangingOptInStatus: boolean;
}

const DefaultParams = {
  savedObjectNotFound: false,
  savedObjectForbidden: false,
  enabled: true,
  lastVersionChecked: '8.0.0',
  currentKibanaVersion: '8.0.0',
  configTelemetryOptIn: null,
  allowChangingOptInStatus: true,
};

function getCallGetTelemetryOptInParams(
  overrides: Partial<CallGetTelemetryOptInParams>
): CallGetTelemetryOptInParams {
  return { ...DefaultParams, ...overrides };
}

function callGetTelemetryOptIn(params: CallGetTelemetryOptInParams) {
  const { currentKibanaVersion, configTelemetryOptIn, allowChangingOptInStatus } = params;
  const telemetrySavedObject = getMockTelemetrySavedObject(params);
  return getTelemetryOptIn({
    currentKibanaVersion,
    telemetrySavedObject,
    allowChangingOptInStatus,
    configTelemetryOptIn,
  });
}

function getMockTelemetrySavedObject(params: CallGetTelemetryOptInParams): TelemetrySavedObject {
  const { savedObjectNotFound } = params;
  if (savedObjectNotFound) {
    return {};
  }

  return {
    enabled: params.enabled,
    lastVersionChecked: params.lastVersionChecked,
  };
}
