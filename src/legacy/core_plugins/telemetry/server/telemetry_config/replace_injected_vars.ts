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

import { getTelemetrySavedObject } from '../telemetry_repository';
import { getTelemetryOptIn } from './get_telemetry_opt_in';
import { getTelemetryUsageFetcher } from './get_telemetry_usage_fetcher';

export async function replaceTelemetryInjectedVars(
  telemetryPluginConfig: any,
  request: any,
  currentKibanaVersion: string
) {
  const savedObjectsClient = request.getSavedObjectsClient();
  const telemetrySavedObject = await getTelemetrySavedObject(savedObjectsClient);
  const telemetryOptedIn = getTelemetryOptIn({
    telemetrySavedObject,
    request,
    currentKibanaVersion,
  });

  const telemetryUsageFetcher = getTelemetryUsageFetcher({
    telemetrySavedObject,
    telemetryPluginConfig,
  });

  return {
    telemetryOptedIn,
    telemetryUsageFetcher,
  };
}
