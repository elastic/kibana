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

import { SavedObjectsClientContract } from '../saved_objects/types';
import { InternalSavedObjectsServiceSetup } from '../saved_objects';
import { InternalHttpServiceSetup } from '../http';
import { UiSettingsConfigType, config as uiConfigDefinition } from './ui_settings_config';
import { UiSettingsClient } from './ui_settings_client';
import {
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
  UiSettingsParams,
} from './types';
import { mapToObject } from '../../utils/';
import { uiSettingsType } from './saved_objects';
import { registerRoutes } from './routes';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
}

/** @internal */
export class UiSettingsService
  implements CoreService<InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart> {
  private readonly log: Logger;
  private readonly config$: Observable<UiSettingsConfigType>;
  private readonly uiSettingsDefaults = new Map<string, UiSettingsParams>();
  private overrides: Record<string, any> = {};

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('ui-settings-service');
    this.config$ = coreContext.configService.atPath<UiSettingsConfigType>(uiConfigDefinition.path);
  }

  public async setup({ http, savedObjects }: SetupDeps): Promise<InternalUiSettingsServiceSetup> {
    this.log.debug('Setting up ui settings service');

    savedObjects.registerType(uiSettingsType);
    registerRoutes(http.createRouter(''));
    const config = await this.config$.pipe(first()).toPromise();
    this.overrides = config.overrides;

    return {
      register: this.register.bind(this),
    };
  }

  public async start(): Promise<InternalUiSettingsServiceStart> {
    this.validatesDefinitions();
    this.validatesOverrides();

    return {
      asScopedToClient: this.getScopedClientFactory(),
    };
  }

  public async stop() {}

  private getScopedClientFactory(): (
    savedObjectsClient: SavedObjectsClientContract
  ) => UiSettingsClient {
    const { version, buildNum } = this.coreContext.env.packageInfo;
    return (savedObjectsClient: SavedObjectsClientContract) =>
      new UiSettingsClient({
        type: 'config',
        id: version,
        buildNum,
        savedObjectsClient,
        defaults: mapToObject(this.uiSettingsDefaults),
        overrides: this.overrides,
        log: this.log,
      });
  }

  private register(settings: Record<string, UiSettingsParams> = {}) {
    Object.entries(settings).forEach(([key, value]) => {
      if (this.uiSettingsDefaults.has(key)) {
        throw new Error(`uiSettings for the key [${key}] has been already registered`);
      }
      this.uiSettingsDefaults.set(key, value);
    });
  }

  private validatesDefinitions() {
    for (const [key, definition] of this.uiSettingsDefaults) {
      if (definition.schema) {
        definition.schema.validate(definition.value, {}, `ui settings defaults [${key}]`);
      }
    }
  }

  private validatesOverrides() {
    for (const [key, value] of Object.entries(this.overrides)) {
      const definition = this.uiSettingsDefaults.get(key);
      if (definition?.schema) {
        definition.schema.validate(value, {}, `ui settings overrides [${key}]`);
      }
    }
  }
}
