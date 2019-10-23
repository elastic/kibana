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

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { CoreService } from '../../types';
import { CoreContext } from '../core_context';
import { Logger } from '../logging';

import { SavedObjectsClientContract, SavedObjectAttribute } from '../saved_objects/types';
import { InternalHttpServiceSetup } from '../http';
import { UiSettingsConfigType } from './ui_settings_config';
import { IUiSettingsClient, UiSettingsClient } from './ui_settings_client';
import { mapToObject } from '../../utils/';

interface SetupDeps {
  http: InternalHttpServiceSetup;
}

/**
 * UI element type to represent the settings.
 * @public
 * */
export type UiSettingsType = 'json' | 'markdown' | 'number' | 'select' | 'boolean' | 'string';

/**
 * UiSettings parameters defined by the plugins.
 * @public
 * */
export interface UiSettingsParams {
  /** title in the UI */
  name: string;
  /** default value to fall back to if a user doesn't provide any */
  value: SavedObjectAttribute;
  /** description provided to a user in UI */
  description: string;
  /** used to group the configured setting in the UI */
  category: string[];
  /** a range of valid values */
  options?: string[];
  /** text labels for 'select' type UI element */
  optionLabels?: Record<string, string>;
  /** a flag indicating whether new value applying requires page reloading */
  requiresPageReload?: boolean;
  /** a flag indicating that value cannot be changed */
  readonly?: boolean;
  /** defines a type of UI element {@link UiSettingsType} */
  type?: UiSettingsType;
}

/** @internal */
export interface InternalUiSettingsServiceSetup {
  /**
   * Sets the parameters with default values for the uiSettings.
   * @param values
   */
  setDefaults(values: Record<string, UiSettingsParams>): void;
  /**
   * Creates uiSettings client with provided *scoped* saved objects client {@link IUiSettingsClient}
   * @param values
   */
  asScopedToClient(savedObjectsClient: SavedObjectsClientContract): IUiSettingsClient;
}

/** @internal */
export class UiSettingsService implements CoreService<InternalUiSettingsServiceSetup> {
  private readonly log: Logger;
  private readonly config$: Observable<UiSettingsConfigType>;
  private readonly uiSettingsDefaults = new Map<string, UiSettingsParams>();

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('ui-settings-service');
    this.config$ = coreContext.configService.atPath<UiSettingsConfigType>('uiSettings');
  }

  public async setup(deps: SetupDeps): Promise<InternalUiSettingsServiceSetup> {
    this.log.debug('Setting up ui settings service');
    const overrides = await this.getOverrides(deps);
    const { version, buildNum } = this.coreContext.env.packageInfo;

    return {
      setDefaults: this.setDefaults.bind(this),
      asScopedToClient: (savedObjectsClient: SavedObjectsClientContract) => {
        return new UiSettingsClient({
          type: 'config',
          id: version,
          buildNum,
          savedObjectsClient,
          defaults: mapToObject(this.uiSettingsDefaults),
          overrides,
          log: this.log,
        });
      },
    };
  }

  public async start() {}

  public async stop() {}

  private setDefaults(values: Record<string, UiSettingsParams> = {}) {
    Object.entries(values).forEach(([key, value]) => {
      if (this.uiSettingsDefaults.has(key)) {
        throw new Error(`uiSettings defaults for key [${key}] has been already set`);
      }
      this.uiSettingsDefaults.set(key, value);
    });
  }

  private async getOverrides(deps: SetupDeps) {
    const config = await this.config$.pipe(first()).toPromise();
    const overrides: Record<string, SavedObjectAttribute> = config.overrides;
    // manually implemented deprecation until New platform Config service
    // supports them https://github.com/elastic/kibana/issues/40255
    if (typeof deps.http.config.defaultRoute !== 'undefined') {
      overrides.defaultRoute = deps.http.config.defaultRoute;
      this.log.warn(
        'Config key "server.defaultRoute" is deprecated. It has been replaced with "uiSettings.overrides.defaultRoute"'
      );
    }

    return overrides;
  }
}
