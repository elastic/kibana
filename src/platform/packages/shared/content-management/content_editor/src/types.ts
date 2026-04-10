/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsReference } from './services';

/**
 * Tags can be provided as either:
 * - `string[]` — plain tag IDs (used by Content List and other ID-based systems)
 * - `SavedObjectsReference[]` — full reference objects (used by legacy TableListView)
 *
 * The content editor normalizes both formats to `string[]` internally for form state
 * and `onSave` callbacks.
 */
export type ItemTags = string[] | SavedObjectsReference[];

export interface Item {
  id: string;
  title: string;
  description?: string;
  tags: ItemTags;

  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;

  managed?: boolean;
}
