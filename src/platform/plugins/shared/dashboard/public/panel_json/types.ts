/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GridData } from '@kbn/as-code-dashboard-schema';

/** A panel shaped like an entry of the Dashboards API `panels` array, without its `id`. */
export interface PanelJsonEntry {
  type: string;
  grid: GridData;
  config: object;
}

/** Panels validated by the sanitize route and ready to be added to a dashboard. */
export interface ImportedPanels {
  panels: PanelJsonEntry[];
}
