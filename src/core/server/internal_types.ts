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

import { InternalElasticsearchServiceSetup } from './elasticsearch';
import { InternalPulseService } from './pulse';
import { InternalHttpServiceSetup } from './http';
import { InternalUiSettingsServiceSetup } from './ui_settings';
import { ContextSetup } from './context';
import {
  InternalSavedObjectsServiceStart,
  InternalSavedObjectsServiceSetup,
} from './saved_objects';
import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { UuidServiceSetup } from './uuid';

/** @internal */
export interface InternalCoreSetup {
  capabilities: CapabilitiesSetup;
  context: ContextSetup;
  http: InternalHttpServiceSetup;
  elasticsearch: InternalElasticsearchServiceSetup;
  pulse: InternalPulseService;
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
}
