/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { firstValueFrom, Observable } from 'rxjs';
import { mapToObject } from '@kbn/std';

import type { Logger } from '@kbn/logging';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { UiSettingsConfigType, uiSettingsConfig as uiConfigDefinition } from './ui_settings_config';
import { UiSettingsClient } from './ui_settings_client';
import type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './types';
import type { InternalUiSettingsRequestHandlerContext } from './internal_types';
import { uiSettingsType } from './saved_objects';
import { registerRoutes } from './routes';
import { getCoreSettings } from './settings';
import { UiSettingsDefaultsClient } from './ui_settings_defaults_client';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
}

/** @internal */
export class UiSettingsService
  implements CoreService<InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart>
{
  private readonly log: Logger;
  private readonly config$: Observable<UiSettingsConfigType>;
  private readonly isDist: boolean;
  private readonly uiSettingsDefaults = new Map<string, UiSettingsParams>();
  private overrides: Record<string, any> = {};

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('ui-settings-service');
    this.isDist = coreContext.env.packageInfo.dist;
    this.config$ = coreContext.configService.atPath<UiSettingsConfigType>(uiConfigDefinition.path);
  }

  public async preboot(): Promise<InternalUiSettingsServicePreboot> {
    this.log.debug('Prebooting ui settings service');

    const { overrides } = await firstValueFrom(this.config$);
    this.overrides = overrides;

    this.register(getCoreSettings({ isDist: this.isDist }));

    return {
      createDefaultsClient: () =>
        new UiSettingsDefaultsClient({
          defaults: mapToObject(this.uiSettingsDefaults),
          overrides: this.overrides,
          log: this.log.get('core defaults'),
        }),
    };
  }

  public async setup({ http, savedObjects }: SetupDeps): Promise<InternalUiSettingsServiceSetup> {
    this.log.debug('Setting up ui settings service');

    savedObjects.registerType(uiSettingsType);
    registerRoutes(http.createRouter<InternalUiSettingsRequestHandlerContext>(''));

    const config = await firstValueFrom(this.config$);
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
      if (!definition.schema) {
        throw new Error(`Validation schema is not provided for [${key}] UI Setting`);
      }
      definition.schema.validate(definition.value, {}, `ui settings defaults [${key}]`);
    }
  }

  private validatesOverrides() {
    for (const [key, value] of Object.entries(this.overrides)) {
      const definition = this.uiSettingsDefaults.get(key);
      // overrides might contain UiSettings for a disabled plugin
      if (definition?.schema) {
        definition.schema.validate(value, {}, `ui settings overrides [${key}]`);
      }
    }
  }
}
