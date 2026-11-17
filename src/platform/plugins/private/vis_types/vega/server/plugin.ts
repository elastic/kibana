/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, firstValueFrom, type Subscription } from 'rxjs';
import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
} from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import type {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';
import {
  VEGA_AS_CODE_ENABLED_FLAG,
  VEGA_EMBEDDABLE_TYPE,
  VEGA_VIS_NAME,
} from '../common/constants';
import { getVegaEmbeddableSchema } from './embeddable/schema';
import { getTransforms } from './embeddable/transforms';
import { vegaLibraryItemSavedObjectType } from './vega_saved_object';
import { registerRoutes } from './api/register_routes';
import {
  LEGACY_VEGA_PANEL_MIGRATION_DEFAULT,
  LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
} from './legacy_vega_panel_migration/constants';
import { migrateLegacyVegaPanel } from './legacy_vega_panel_migration/migrate';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private readonly logger: Logger;
  private apiUsageCounter?: UsageCounter;
  private asCodeEnabled = false;
  private legacyVegaPanelMigrationEnabled = LEGACY_VEGA_PANEL_MIGRATION_DEFAULT;
  private legacyVegaPanelMigrationSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    { embeddable, usageCollection, visualizations }: VisTypeVegaPluginSetupDependencies
  ) {
    // Startup-only: public API/OpenAPI contract should not hot-swap mid-process.
    // The embeddable definition is registered only once the flag is known, so
    // `getSchema` can never observe the default (disabled) value while the flag is on.
    void core
      .getStartServices()
      .then(async ([{ featureFlags }]) => {
        const asCodeEnabled = await firstValueFrom(
          featureFlags.getBooleanValue$(VEGA_AS_CODE_ENABLED_FLAG, false)
        );
        this.asCodeEnabled = asCodeEnabled;
        embeddable.registerEmbeddableServerDefinition(VEGA_EMBEDDABLE_TYPE, {
          title: 'Vega',
          getTransforms: (drilldownTransforms) => getTransforms(drilldownTransforms, this.logger),
          getSchema: (getDrilldownsSchema) =>
            asCodeEnabled ? getVegaEmbeddableSchema(getDrilldownsSchema) : undefined,
        });
      })
      .catch((error) => {
        this.logger.error(`Failed to register the Vega embeddable: ${error}`);
      });

    core.savedObjects.registerType(vegaLibraryItemSavedObjectType);

    if (usageCollection) {
      this.apiUsageCounter = usageCollection.createUsageCounter('vega_api');
    }
    registerRoutes(core.http, this.apiUsageCounter, this.logger);

    visualizations.registerLegacyPanelMigration(VEGA_VIS_NAME, {
      to: VEGA_EMBEDDABLE_TYPE,
      migrate: (args) =>
        this.asCodeEnabled && this.legacyVegaPanelMigrationEnabled
          ? migrateLegacyVegaPanel(args)
          : undefined,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.legacyVegaPanelMigrationSubscription = core.featureFlags
      .getBooleanValue$(
        LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
        LEGACY_VEGA_PANEL_MIGRATION_DEFAULT
      )
      .pipe(distinctUntilChanged())
      .subscribe((enabled) => {
        this.legacyVegaPanelMigrationEnabled = enabled;
      });
    return {};
  }

  public stop() {
    this.legacyVegaPanelMigrationSubscription?.unsubscribe();
  }
}
