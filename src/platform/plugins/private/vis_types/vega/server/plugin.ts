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
import type {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';
import {
  VEGA_EMBEDDABLE_TYPE,
  VEGA_STANDALONE_EMBEDDABLE_FLAG,
  VEGA_VIS_NAME,
} from '../common/constants';
import { getVegaEmbeddableSchema } from './embeddable/schema';
import { getTransforms } from './embeddable/transforms';
import {
  LEGACY_VEGA_PANEL_MIGRATION_DEFAULT,
  LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
} from './legacy_vega_panel_migration/constants';
import { migrateLegacyVegaPanel } from './legacy_vega_panel_migration/migrate';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private readonly logger: Logger;
  private standaloneEmbeddableEnabled = false;
  private legacyVegaPanelMigrationEnabled = LEGACY_VEGA_PANEL_MIGRATION_DEFAULT;
  private legacyVegaPanelMigrationSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    { embeddable, visualizations }: VisTypeVegaPluginSetupDependencies
  ) {
    core
      .getStartServices()
      .then(async ([{ featureFlags }]) => {
        const standaloneEmbeddableEnabled = await firstValueFrom(
          featureFlags.getBooleanValue$(VEGA_STANDALONE_EMBEDDABLE_FLAG, false)
        );
        this.standaloneEmbeddableEnabled = standaloneEmbeddableEnabled;
        embeddable.registerEmbeddableServerDefinition(VEGA_EMBEDDABLE_TYPE, {
          title: 'Vega',
          getTransforms: (drilldownTransforms) => getTransforms(drilldownTransforms, this.logger),
          getSchema: (getDrilldownsSchema) =>
            standaloneEmbeddableEnabled ? getVegaEmbeddableSchema(getDrilldownsSchema) : undefined,
        });
      })
      .catch(() => {});

    visualizations.registerLegacyPanelMigration(VEGA_VIS_NAME, {
      to: VEGA_EMBEDDABLE_TYPE,
      migrate: (args) =>
        this.standaloneEmbeddableEnabled && this.legacyVegaPanelMigrationEnabled
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
