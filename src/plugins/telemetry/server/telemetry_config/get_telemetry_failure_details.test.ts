/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getTelemetryFailureDetails } from './get_telemetry_failure_details';

describe('getTelemetryFailureDetails: get details about server usage fetcher failures', () => {
  it('returns `failureCount: 0` and `failureVersion: undefined` when telemetry does not have any custom configs in saved Object', () => {
    const telemetrySavedObject = {};
    const failureDetails = getTelemetryFailureDetails({ telemetrySavedObject });
    expect(failureDetails).toStrictEqual({
      failureVersion: undefined,
      failureCount: 0,
    });
  });

  it('returns telemetryFailureCount and reportFailureVersion from telemetry saved Object', () => {
    const telemetrySavedObject = {
      reportFailureCount: 12,
      reportFailureVersion: '8.0.0',
    };
    const failureDetails = getTelemetryFailureDetails({ telemetrySavedObject });
    expect(failureDetails).toStrictEqual({
      failureVersion: '8.0.0',
      failureCount: 12,
    });
  });

  it('returns `failureCount: 0` on malformed reportFailureCount telemetry saved Object', () => {
    const failureVersion = '8.0.0';
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          // @ts-expect-error the test is intentionally testing malformed SOs
          reportFailureCount: null,
          reportFailureVersion: failureVersion,
        },
      })
    ).toStrictEqual({ failureVersion, failureCount: 0 });
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          reportFailureCount: undefined,
          reportFailureVersion: failureVersion,
        },
      })
    ).toStrictEqual({ failureVersion, failureCount: 0 });
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          // @ts-expect-error the test is intentionally testing malformed SOs
          reportFailureCount: 'not_a_number',
          reportFailureVersion: failureVersion,
        },
      })
    ).toStrictEqual({ failureVersion, failureCount: 0 });
  });

  it('returns `failureVersion: undefined` on malformed reportFailureCount telemetry saved Object', () => {
    const failureCount = 0;
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          // @ts-expect-error the test is intentionally testing malformed SOs
          reportFailureVersion: null,
          reportFailureCount: failureCount,
        },
      })
    ).toStrictEqual({ failureCount, failureVersion: undefined });
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: { reportFailureVersion: undefined, reportFailureCount: failureCount },
      })
    ).toStrictEqual({ failureCount, failureVersion: undefined });
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          // @ts-expect-error the test is intentionally testing malformed SOs
          reportFailureVersion: 123,
          reportFailureCount: failureCount,
        },
      })
    ).toStrictEqual({ failureCount, failureVersion: undefined });
  });
});
