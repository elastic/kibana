/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import { type DataSource, EsqlSource, IndexPatternSource } from '@kbn/data-source';

/**
 * Returns a `DataView` for use with legacy helpers that haven't migrated off
 * the `DataView` API. Single dispatcher for the `DataSource → DataView`
 * compatibility seam used internally by `unified-data-table`.
 *
 * - `IndexPatternSource` → its wrapped `DataView`.
 * - `EsqlSource` → its compatibility DataView (the adhoc cache-adapter DV
 *   passed at construction).
 *
 * Will be deleted once `kbn-discover-utils` formatter helpers (and their
 * other callers) migrate off `DataView`.
 */
export function getCompatDataView(dataSource: DataSource | undefined): DataView | undefined {
  if (dataSource instanceof IndexPatternSource) return dataSource.getDataView();
  if (dataSource instanceof EsqlSource) return dataSource.getCompatibilityDataView();
  return undefined;
}
