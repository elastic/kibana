/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializedVis } from '../../common';
import type { VisualizeEmbeddableBaseState } from '../../common/embeddable/types';

export interface LegacyPanelMigration {
  /** Panel type that migrated panels are returned as. */
  to: string;
  /**
   * Returns the target panel config for a by-value legacy visualization panel, or `undefined` to
   * leave the panel unchanged. Throwing drops the panel with a warning.
   */
  migrate: (args: {
    savedVis: SerializedVis;
    panelConfig: VisualizeEmbeddableBaseState;
  }) => Record<string, unknown> | undefined;
}
