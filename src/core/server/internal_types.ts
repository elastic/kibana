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

import { Type } from '@kbn/config-schema';

import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { ConfigDeprecationProvider } from './config';
import { ContextSetup } from './context';
import { InternalElasticsearchServiceSetup } from './elasticsearch';
import { InternalHttpServiceSetup } from './http';
import {
  InternalSavedObjectsServiceSetup,
  InternalSavedObjectsServiceStart,
} from './saved_objects';
import { InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart } from './ui_settings';
import { UuidServiceSetup } from './uuid';

/** @internal */
export interface InternalCoreSetup {
  capabilities: CapabilitiesSetup;
  context: ContextSetup;
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  uiSettings: InternalUiSettingsServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
  uuid: UuidServiceSetup;
}

/**
 * @internal
 */
export interface InternalCoreStart {
  capabilities: CapabilitiesStart;
  savedObjects: InternalSavedObjectsServiceStart;
  uiSettings: InternalUiSettingsServiceStart;
}

/**
 * @internal
 */
export interface ServiceConfigDescriptor<T = any> {
  path: string;
  /**
   * Schema to use to validate the configuration.
   */
  schema: Type<T>;
  /**
   * Provider for the {@link ConfigDeprecation} to apply to the plugin configuration.
   */
  deprecations?: ConfigDeprecationProvider;
}
