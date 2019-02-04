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

import { get } from 'lodash';
import { UiSettingsState } from '../ui_settings';
import { deepFreeze } from './deep_freeze';

export interface InjectedMetadataParams {
  injectedMetadata: {
    version: string;
    buildNumber: number;
    basePath: string;
    vars: {
      [key: string]: unknown;
    };
    legacyMetadata: {
      app: unknown;
      translations: unknown;
      bundleId: string;
      nav: unknown;
      version: string;
      branch: string;
      buildNum: number;
      buildSha: string;
      basePath: string;
      serverName: string;
      devMode: boolean;
      uiSettings: {
        defaults: UiSettingsState;
        user?: UiSettingsState;
      };
    };
  };
}

/**
 * Provides access to the metadata that is injected by the
 * server into the page. The metadata is actually defined
 * in the entry file for the bundle containing the new platform
 * and is read from the DOM in most cases.
 */
export class InjectedMetadataService {
  private state = deepFreeze(this.params.injectedMetadata);

  constructor(private readonly params: InjectedMetadataParams) {}

  public start() {
    return {
      getBasePath: () => {
        return this.state.basePath;
      },

      getKibanaVersion: () => {
        return this.getKibanaVersion();
      },

      getLegacyMetadata: () => {
        return this.state.legacyMetadata;
      },

      getInjectedVar: (name: string, defaultValue?: any): unknown => {
        return get(this.state.vars, name, defaultValue);
      },

      getInjectedVars: () => {
        return this.state.vars;
      },
    };
  }

  public getKibanaVersion() {
    return this.state.version;
  }

  public getKibanaBuildNumber() {
    return this.state.buildNumber;
  }
}

export type InjectedMetadataStartContract = ReturnType<InjectedMetadataService['start']>;
