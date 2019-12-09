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

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/public';

interface StatusPageConfig {
  isStatusPageAnonymous: boolean;
}

export class StatusPagePlugin implements Plugin<StatusPagePluginSetup, StatusPagePluginStart> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    const { isStatusPageAnonymous } = this.initializerContext.config.get<StatusPageConfig>();

    if (isStatusPageAnonymous) {
      core.http.anonymousPaths.register('/status');
    }
  }

  public start() {}

  public stop() {}
}

export type StatusPagePluginSetup = ReturnType<StatusPagePlugin['setup']>;
export type StatusPagePluginStart = ReturnType<StatusPagePlugin['start']>;
