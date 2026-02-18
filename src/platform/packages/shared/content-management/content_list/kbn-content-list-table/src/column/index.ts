/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Declarative components and props.
export { Column, type ColumnProps } from './part';
export { NameColumn, type NameColumnProps, NameCell, type NameCellProps } from './name';
export {
  UpdatedAtColumn,
  type UpdatedAtColumnProps,
  UpdatedAtCell,
  type UpdatedAtCellProps,
} from './updated_at';

// Namespace type for TypeScript typing of `Column`.
export type { ColumnNamespace } from './part';
