/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';
import type { PanelTypeMigration, PanelTypeMigrationResult } from '@kbn/embeddable-plugin/server';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type { VisualizeByValueState } from '../../common/embeddable/types';
import type { LegacyPanelMigration } from './types';

/**
 * Migrates by-value legacy visualization panels with the migration registered for their vis type.
 * By-reference panels are left unchanged.
 */
export const getLegacyVisPanelTypeMigration = (
  getLegacyPanelMigration: (visType: string) => LegacyPanelMigration | undefined
): PanelTypeMigration => ({
  from: VISUALIZE_EMBEDDABLE_TYPE,
  migrateOut: async (panels) =>
    panels.flatMap(({ id, config }): PanelTypeMigrationResult[] => {
      if (config.savedObjectId) return [];

      const { savedVis, ...state } = config as Partial<VisualizeByValueState>;
      const migration = savedVis && getLegacyPanelMigration(savedVis.type);
      if (!savedVis || !migration) return [];

      try {
        const migratedConfig = migration.migrate({
          savedVis,
          panelConfig: pick(state, [
            'title',
            'description',
            'hide_title',
            'hide_border',
            'time_range',
            'drilldowns',
          ]),
        });
        return migratedConfig ? [{ panelId: id, type: migration.to, config: migratedConfig }] : [];
      } catch (error) {
        return [{ panelId: id, error: error instanceof Error ? error : new Error(String(error)) }];
      }
    }),
});
