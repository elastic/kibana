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
 * The idea here is to provide a temporary home for defining dependency
 * types that are passed to plugins in the new platform.
 *
 * When a plugin is being shimmed and requires a dependency not listed here,
 * it should be added to the list so the same name is used consistently in
 * future shims. This will also help us to identify what the public contracts
 * should be in our new platform plugins.
 *
 * Once shims are fully removed and everything is migrated, this file can be
 * deleted and the relevant types can be directly imported from each plugin.
 */
export interface Ui {
  readonly createLegacyClass: any;
  readonly savedObjectLoader: any;
  readonly savedObjectProvider: any;
  readonly savedObjectsClientProvider: any;
  readonly uiModules: any;
}

export interface Management {
  readonly savedObjectManagementRegistry: any;
}

export interface Visualize {
  readonly updateOldState: any;
  readonly visProvider: any;
  readonly visTypesRegistryProvider: any;
}

export interface Dependencies {
  // ui/public stuff
  readonly ui?: Ui;

  // new platform plugins (oss)
  readonly dashboard?: {};
  readonly dataAccess?: {};
  readonly discover?: {};
  readonly embeddables?: {};
  readonly globalSearchSource?: {};
  readonly home?: {};
  readonly interpreter?: {};
  readonly management?: Management;
  readonly visEditor?: {};
  readonly visualize?: Visualize;

  // new platform plugins (x-pack)
  readonly dashboardMode?: {};
  readonly graph?: {};
  readonly kueryAutocomplete?: {};
  readonly reporting?: {};
  readonly telemetry?: {};
}
