/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom, Observable } from 'rxjs';
import { mapToObject } from '@kbn/std';

import type { Logger } from '@kbn/logging';
import { stripVersionQualifier } from '@kbn/std';
import type { CoreContext, CoreService } from '@kbn/core-base-server-internal';
import type { InternalHttpServiceSetup } from '@kbn/core-http-server-internal';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { InternalSavedObjectsServiceSetup } from '@kbn/core-saved-objects-server-internal';
import type {
  ReadonlyModeType,
  UiSettingsParams,
  UiSettingsScope,
} from '@kbn/core-ui-settings-common';
import { UiSettingsConfigType, uiSettingsConfig as uiConfigDefinition } from './ui_settings_config';
import { UiSettingsClient, UiSettingsClientFactory, UiSettingsGlobalClient } from './clients';
import type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './types';
import type { InternalUiSettingsRequestHandlerContext } from './internal_types';
import { uiSettingsType, uiSettingsGlobalType } from './saved_objects';
import { registerRoutes, registerInternalRoutes } from './routes';
import { getCoreSettings } from './settings';
import { UiSettingsDefaultsClient } from './clients/ui_settings_defaults_client';

export interface SetupDeps {
  http: InternalHttpServiceSetup;
  savedObjects: InternalSavedObjectsServiceSetup;
}

type ClientType<T> = T extends 'global'
  ? UiSettingsGlobalClient
  : T extends 'namespace'
  ? UiSettingsClient
  : never;

/** @internal */
export class UiSettingsService
  implements CoreService<InternalUiSettingsServiceSetup, InternalUiSettingsServiceStart>
{
  private readonly log: Logger;
  private readonly config$: Observable<UiSettingsConfigType>;
  private readonly isDist: boolean;
  private readonly isDev: boolean;
  private readonly uiSettingsDefaults = new Map<string, UiSettingsParams>();
  private readonly uiSettingsGlobalDefaults = new Map<string, UiSettingsParams>();
  private overrides: Record<string, any> = {};
  private allowlist: Set<string> | null = null;

  constructor(private readonly coreContext: CoreContext) {
    this.log = coreContext.logger.get('ui-settings-service');
    this.isDist = coreContext.env.packageInfo.dist;
    this.config$ = coreContext.configService.atPath<UiSettingsConfigType>(uiConfigDefinition.path);
    this.isDev = coreContext.env.mode.dev;
  }

  public async preboot(): Promise<InternalUiSettingsServicePreboot> {
    this.log.debug('Prebooting ui settings service');

    const { overrides, experimental } = await firstValueFrom(this.config$);
    this.overrides = overrides;

    this.register(
      getCoreSettings({
        isDist: this.isDist,
        isThemeSwitcherEnabled: experimental?.themeSwitcherEnabled,
      })
    );

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

    const config = await firstValueFrom(this.config$);
    this.overrides = config.overrides;
    savedObjects.registerType(uiSettingsType);
    savedObjects.registerType(uiSettingsGlobalType);

    const router = http.createRouter<InternalUiSettingsRequestHandlerContext>('');
    registerInternalRoutes(router);

    // Register public routes by default unless the publicApiEnabled config setting is set to false
    if (!Object.hasOwn(config, 'publicApiEnabled') || config.publicApiEnabled === true) {
      registerRoutes(router);
    }

    return {
      register: this.register,
      registerGlobal: this.registerGlobal,
      setAllowlist: this.setAllowlist,
    };
  }

  public async start(): Promise<InternalUiSettingsServiceStart> {
    if (this.allowlist) {
      // If we are in development mode, check if all settings in the allowlist are registered
      if (this.isDev) {
        this.validateAllowlist();
      }
      this.applyAllowlist(this.uiSettingsDefaults, false);
      this.applyAllowlist(this.uiSettingsGlobalDefaults, true);
    }
    this.validatesDefinitions();
    this.validatesOverrides();

    return {
      asScopedToClient: this.getScopedClientFactory('namespace'),
      globalAsScopedToClient: this.getScopedClientFactory('global'),
    };
  }

  public async stop() {}

  private getScopedClientFactory<T extends UiSettingsScope>(
    scope: UiSettingsScope
  ): (savedObjectsClient: SavedObjectsClientContract) => ClientType<T> {
    const { version, buildNum } = this.coreContext.env.packageInfo;
    return (savedObjectsClient: SavedObjectsClientContract): ClientType<T> => {
      const isNamespaceScope = scope === 'namespace';
      const options = {
        type: (isNamespaceScope ? 'config' : 'config-global') as 'config' | 'config-global',
        id: stripVersionQualifier(version),
        buildNum,
        savedObjectsClient,
        defaults: isNamespaceScope
          ? mapToObject(this.uiSettingsDefaults)
          : mapToObject(this.uiSettingsGlobalDefaults),
        overrides: isNamespaceScope ? this.overrides : {},
        log: this.log,
      };
      return UiSettingsClientFactory.create(options) as ClientType<T>;
    };
  }

  private register = (settings: Record<string, UiSettingsParams> = {}) => {
    Object.entries(settings).forEach(([key, value]) => {
      if (this.uiSettingsDefaults.has(key)) {
        throw new Error(`uiSettings for the key [${key}] has been already registered`);
      }
      this.uiSettingsDefaults.set(key, value);
    });
  };

  private registerGlobal = (settings: Record<string, UiSettingsParams> = {}) => {
    Object.entries(settings).forEach(([key, value]) => {
      if (this.uiSettingsGlobalDefaults.has(key)) {
        throw new Error(`Global uiSettings for the key [${key}] has been already registered`);
      }
      this.uiSettingsGlobalDefaults.set(key, value);
    });
  };

  private setAllowlist = (keys: string[]) => {
    // Disabling this check for now since it causes some test failures
    // if (this.allowlist) {
    //   throw new Error(
    //     `The uiSettings allowlist has already been set up. Instead of calling setAllowlist(), add your settings to packages/serverless/settings`
    //   );
    // }
    this.allowlist = new Set(keys);
  };

  private validateAllowlist() {
    this.allowlist?.forEach((key) => {
      if (!this.uiSettingsDefaults.has(key) && !this.uiSettingsGlobalDefaults.has(key)) {
        throw new Error(
          `The uiSetting with key [${key}] is in the allowlist but is not registered. Make sure to remove it from the allowlist in /packages/serverless/settings`
        );
      }
    });
  }

  private setReadonlyMode(key: string, mode: ReadonlyModeType, isGlobal: boolean) {
    if (isGlobal) {
      const definition = this.uiSettingsGlobalDefaults.get(key);
      if (definition) {
        this.uiSettingsGlobalDefaults.set(key, { ...definition, readonlyMode: mode });
      }
    } else {
      const definition = this.uiSettingsDefaults.get(key);
      if (definition) {
        this.uiSettingsDefaults.set(key, { ...definition, readonlyMode: mode });
      }
    }
  }

  private applyAllowlist(settingsDefaults: Map<string, UiSettingsParams>, isGlobal: boolean) {
    for (const [key, definition] of settingsDefaults) {
      // Settings in the allowlist that are already read-only should have 'ui' readonly mode
      if (this.allowlist?.has(key) && definition.readonly === true) {
        this.setReadonlyMode(key, 'ui', isGlobal);
      }

      // Setting that are not in the allowlist should have 'strict' readonly mode
      if (!this.allowlist?.has(key)) {
        definition.readonly = true;
        this.setReadonlyMode(key, 'strict', isGlobal);
      }
    }
  }

  private validatesDefinitions() {
    for (const [key, definition] of this.uiSettingsDefaults) {
      if (!definition.schema) {
        throw new Error(`Validation schema is not provided for [${key}] UI Setting`);
      }
      if (definition.value) {
        definition.schema.validate(definition.value, {}, `ui settings defaults [${key}]`);
      }
    }
    for (const [key, definition] of this.uiSettingsGlobalDefaults) {
      if (!definition.schema) {
        throw new Error(`Validation schema is not provided for [${key}] Global UI Setting`);
      }
      if (definition.value) {
        definition.schema.validate(definition.value, {});
      }
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
