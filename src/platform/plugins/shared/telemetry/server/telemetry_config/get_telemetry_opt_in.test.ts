/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TelemetrySavedObject } from '../saved_objects';
import { getTelemetryOptIn } from './get_telemetry_opt_in';

describe('getTelemetryOptIn', () => {
  it('returns null when saved object not found', async () => {
    const params = getCallGetTelemetryOptInParams({
      savedObjectNotFound: true,
    });

    const result = await callGetTelemetryOptIn(params);

    expect(result).toBe(null);
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

  describe('feature flag', () => {
    it('honors an explicit opt-out when the feature flag is enabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({ enabled: false, isOptedInFromFeatureFlag: true })
      );

      expect(result).toBe(false);
    });

    it('honors an explicit opt-in when the feature flag is disabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({ enabled: true, isOptedInFromFeatureFlag: false })
      );

      expect(result).toBe(true);
    });

    it('honors a locked kibana.yml opt-out when the feature flag is enabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          allowChangingOptInStatus: false,
          configTelemetryOptIn: false,
          enabled: true,
          isOptedInFromFeatureFlag: true,
        })
      );

      expect(result).toBe(false);
    });

    it('turns a locked opt-in off when the feature flag is disabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          allowChangingOptInStatus: false,
          configTelemetryOptIn: true,
          enabled: false,
          isOptedInFromFeatureFlag: false,
        })
      );

      expect(result).toBe(false);
    });

    it('keeps a locked opt-in when the feature flag is enabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          allowChangingOptInStatus: false,
          configTelemetryOptIn: true,
          isOptedInFromFeatureFlag: true,
        })
      );

      expect(result).toBe(true);
    });

    it('stays undecided when opt-in is locked on and the feature flag is not known yet', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          allowChangingOptInStatus: false,
          configTelemetryOptIn: true,
          isOptedInFromFeatureFlag: undefined,
        })
      );

      expect(result).toBe(null);
    });

    it('keeps an undecided opt-in as null when the feature flag is enabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          savedObjectNotFound: true,
          isOptedInFromFeatureFlag: true,
        })
      );

      expect(result).toBe(null);
    });

    it('returns false when opt-in is undecided and the feature flag is disabled', async () => {
      const result = await callGetTelemetryOptIn(
        getCallGetTelemetryOptInParams({
          savedObjectNotFound: true,
          isOptedInFromFeatureFlag: false,
        })
      );

      expect(result).toBe(false);
    });
  });
});

interface CallGetTelemetryOptInParams {
  savedObjectNotFound: boolean;
  lastVersionChecked?: string; // should be a string, but test with non-strings
  currentKibanaVersion: string;
  result?: boolean | null;
  enabled: boolean | null | undefined;
  configTelemetryOptIn: boolean | null;
  allowChangingOptInStatus: boolean;
  isOptedInFromFeatureFlag?: boolean | undefined;
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
  const isOptedInFromFeatureFlag = Object.hasOwn(params, 'isOptedInFromFeatureFlag')
    ? params.isOptedInFromFeatureFlag
    : true;
  const telemetrySavedObject = getMockTelemetrySavedObject(params);
  return getTelemetryOptIn({
    currentKibanaVersion,
    telemetrySavedObject,
    allowChangingOptInStatus,
    configTelemetryOptIn,
    isOptedInFromFeatureFlag,
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
