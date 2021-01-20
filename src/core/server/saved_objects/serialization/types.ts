/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SavedObjectsMigrationVersion, SavedObjectReference } from '../types';

/**
 * A raw document as represented directly in the saved object index.
 *
 * @public
 */
export interface SavedObjectsRawDoc {
  _id: string;
  _source: SavedObjectsRawDocSource;
  _seq_no?: number;
  _primary_term?: number;
}

/** @public */
export interface SavedObjectsRawDocSource {
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  updated_at?: string;
  references?: SavedObjectReference[];
  originId?: string;

  [typeMapping: string]: any;
}

/**
 * Saved Object base document
 */
interface SavedObjectDoc<T = unknown> {
  attributes: T;
  id: string;
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: SavedObjectsMigrationVersion;
  version?: string;
  updated_at?: string;
  originId?: string;
}

interface Referencable {
  references: SavedObjectReference[];
}

/**
 * Describes Saved Object documents from Kibana < 7.0.0 which don't have a
 * `references` root property defined. This type should only be used in
 * migrations.
 *
 * @public
 */
export type SavedObjectUnsanitizedDoc<T = unknown> = SavedObjectDoc<T> & Partial<Referencable>;

/**
 * Describes Saved Object documents that have passed through the migration
 * framework and are guaranteed to have a `references` root property.
 *
 * @public
 */
export type SavedObjectSanitizedDoc<T = unknown> = SavedObjectDoc<T> & Referencable;
