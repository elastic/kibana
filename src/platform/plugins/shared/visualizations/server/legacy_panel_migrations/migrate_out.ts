/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PanelTypeMigration } from '@kbn/embeddable-plugin/server';
import { VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import type {
  VisualizeByReferenceState,
  VisualizeByValueState,
} from '../../common/embeddable/types';
import type { LegacyPanelMigration } from './types';

/**
 * Migrates a by-value legacy visualization panel with the migration registered for its vis type.
 * By-reference panels are left unchanged.
 */
export const getLegacyVisPanelTypeMigration = (
  getLegacyPanelMigration: (visType: string) => LegacyPanelMigration | undefined
): PanelTypeMigration => ({
  from: VISUALIZE_EMBEDDABLE_TYPE,
  migrateOut: (config) => {
    const { savedObjectId, savedVis, ...state } = config as Partial<
      VisualizeByReferenceState & VisualizeByValueState
    >;
    if (savedObjectId || !savedVis) return;

    const migration = getLegacyPanelMigration(savedVis.type);
    if (!migration) return;

    const migratedConfig = migration.migrate({ savedVis, panelConfig: state });
    return migratedConfig && { type: migration.to, config: migratedConfig };
  },
});
