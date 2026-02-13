/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItemConfig, ContentListSupports } from '@kbn/content-list-provider';

/**
 * Context passed to column builder functions.
 *
 * Provides provider-level configuration needed to build
 * `EuiBasicTableColumn` definitions from parsed declarative props.
 */
export interface ColumnBuilderContext {
  /** Item configuration from the content list provider. */
  itemConfig?: ContentListItemConfig;
  /** Whether the table is in read-only mode. */
  isReadOnly?: boolean;
  /** Entity name for display in tooltips and messages. */
  entityName?: string;
  /** Feature support flags from the provider. */
  supports?: ContentListSupports;
}
