/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { distinctUntilChanged, type Subscription } from 'rxjs';
import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/server';
import type { PanelTypeMigration } from '@kbn/embeddable-plugin/server';
import type {
  VisTypeVegaPluginSetupDependencies,
  VisTypeVegaPluginSetup,
  VisTypeVegaPluginStart,
} from './types';
import { VEGA_EMBEDDABLE_TYPE, VEGA_STANDALONE_EMBEDDABLE_FLAG } from '../common/constants';
import { getVegaEmbeddableSchema } from './embeddable/schema';
import { getTransforms } from './embeddable/transforms';
import {
  LEGACY_VEGA_PANEL_MIGRATION_DEFAULT,
  LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
} from './legacy_vega_panel_migration/constants';

const LEGACY_VIS_EMBEDDABLE_TYPE = 'legacy_vis';

export class VisTypeVegaPlugin implements Plugin<VisTypeVegaPluginSetup, VisTypeVegaPluginStart> {
  private legacyVegaMigrationEnabled = LEGACY_VEGA_PANEL_MIGRATION_DEFAULT;
  private legacyVegaMigrationSubscription?: Subscription;

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, { embeddable }: VisTypeVegaPluginSetupDependencies) {
    core
      .getStartServices()
      .then(async ([{ featureFlags }]) => {
        const standaloneEmbeddableEnabled = await featureFlags.getBooleanValue(
          VEGA_STANDALONE_EMBEDDABLE_FLAG,
          false
        );
        embeddable.registerEmbeddableServerDefinition(VEGA_EMBEDDABLE_TYPE, {
          title: 'Vega',
          getTransforms,
          getSchema: (getDrilldownsSchema) =>
            standaloneEmbeddableEnabled ? getVegaEmbeddableSchema(getDrilldownsSchema) : undefined,
        });
      })
      .catch(() => {});

    const legacyVegaMigration: PanelTypeMigration = {
      from: LEGACY_VIS_EMBEDDABLE_TYPE,
      to: VEGA_EMBEDDABLE_TYPE,
      migrateOut: async (_panels, _context) => {
        if (!this.legacyVegaMigrationEnabled) {
          return [];
        }

        // Tasks 3.3 and 3.4 implement the conversion mapping. Until then, keep this a no-op even
        // while enabled so the registry can be wired without behavior changes.
        return [];
      },
    };

    embeddable.registerPanelTypeMigration(legacyVegaMigration);
    return {};
  }

  public start(core: CoreStart) {
    this.legacyVegaMigrationSubscription = core.featureFlags
      .getBooleanValue$(
        LEGACY_VEGA_PANEL_MIGRATION_FEATURE_FLAG,
        LEGACY_VEGA_PANEL_MIGRATION_DEFAULT
      )
      .pipe(distinctUntilChanged())
      .subscribe((enabled) => {
        this.legacyVegaMigrationEnabled = enabled;
      });

    return {};
  }

  public stop() {
    this.legacyVegaMigrationSubscription?.unsubscribe();
    this.legacyVegaMigrationSubscription = undefined;
  }
}
