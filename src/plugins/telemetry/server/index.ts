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

import { PluginInitializerContext, PluginConfigDescriptor } from 'kibana/server';
import { TelemetryPlugin } from './plugin';
import * as constants from '../common/constants';
import { configSchema, TelemetryConfigType } from './config';

export { FetcherTask } from './fetcher';
export { handleOldSettings } from './handle_old_settings';
export { TelemetryPluginsSetup } from './plugin';

export const config: PluginConfigDescriptor<TelemetryConfigType> = {
  schema: configSchema,
  exposeToBrowser: {
    enabled: true,
    url: true,
    banner: true,
    allowChangingOptInStatus: true,
    optIn: true,
    optInStatusUrl: true,
    sendUsageFrom: true,
  },
};

export const plugin = (initializerContext: PluginInitializerContext<TelemetryConfigType>) =>
  new TelemetryPlugin(initializerContext);
export { constants };
export {
  getClusterUuids,
  getLocalLicense,
  getLocalStats,
  TelemetryLocalStats,
  DATA_TELEMETRY_ID,
  DataTelemetryIndex,
  DataTelemetryPayload,
  buildDataTelemetryPayload,
} from './telemetry_collection';
