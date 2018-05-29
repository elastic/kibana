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

/**
 * This is a name of configuration node that is specifically dedicated to
 * the configuration values used by the new platform only. Eventually all
 * its nested values will be migrated to the stable config and this node
 * will be deprecated.
 */
export const NEW_PLATFORM_CONFIG_ROOT = '__newPlatform';

export { ConfigService } from './config_service';
export { RawConfigService } from './raw_config_service';
export { RawConfig } from './raw_config';
/** @internal */
export { ObjectToRawConfigAdapter } from './object_to_raw_config_adapter';
export { Env } from './env';
export { ConfigWithSchema } from './config_with_schema';
