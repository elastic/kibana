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

// @ts-expect-error missing typedef
import good from '@elastic/good';
import { Server } from '@hapi/hapi';
import { LegacyLoggingConfig } from './schema';
import { getLoggingConfiguration } from './get_logging_config';

export async function setupLogging(
  server: Server,
  config: LegacyLoggingConfig,
  opsInterval: number
) {
  // NOTE: legacy logger creates a new stream for each new access
  // In https://github.com/elastic/kibana/pull/55937 we reach the max listeners
  // default limit of 10 for process.stdout which starts a long warning/error
  // thrown every time we start the server.
  // In order to keep using the legacy logger until we remove it I'm just adding
  // a new hard limit here.
  process.stdout.setMaxListeners(25);

  return await server.register({
    plugin: good,
    options: getLoggingConfiguration(config, opsInterval),
  });
}
