/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Types of drop action
 */
export type DropType =
  | 'field_add'
  | 'field_replace'
  | 'reorder'
  | 'move_compatible'
  | 'replace_compatible'
  | 'move_incompatible'
  | 'replace_incompatible'
  | 'replace_duplicate_compatible'
  | 'duplicate_compatible'
  | 'swap_compatible'
  | 'replace_duplicate_incompatible'
  | 'duplicate_incompatible'
  | 'swap_incompatible'
  | 'field_combine'
  | 'combine_compatible'
  | 'combine_incompatible';
