/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Public API - exported to parent
export { NameColumn, type NameColumnProps } from './name';

// Internal exports - used within columns package
export { buildColumn as buildNameColumn, parseProps as parseNameColumnProps } from './name_builder';
export type { NameColumnConfig } from './name_builder';
export { NameCell, type NameCellProps } from './name_cell';
