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

import { getTelemetryFailureDetails } from './get_telemetry_failure_details';

describe('getTelemetryFailureDetails: get details about server usage fetcher failures', () => {
  it('returns `failureCount: 0` and `failureVersion: undefined` when telemetry does not have any custom configs in saved Object', () => {
    const telemetrySavedObject = null;
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
          reportFailureCount: null,
          reportFailureVersion: failureVersion,
        } as any,
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
          reportFailureCount: 'not_a_number',
          reportFailureVersion: failureVersion,
        } as any,
      })
    ).toStrictEqual({ failureVersion, failureCount: 0 });
  });

  it('returns `failureVersion: undefined` on malformed reportFailureCount telemetry saved Object', () => {
    const failureCount = 0;
    expect(
      getTelemetryFailureDetails({
        telemetrySavedObject: {
          reportFailureVersion: null,
          reportFailureCount: failureCount,
        } as any,
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
          reportFailureVersion: 123,
          reportFailureCount: failureCount,
        } as any,
      })
    ).toStrictEqual({ failureCount, failureVersion: undefined });
  });
});
