/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core-saved-objects-server';
import type { CoreUsageStats } from '@kbn/core-usage-data-server';
export declare const migrateTo7141: (doc: SavedObjectUnsanitizedDoc<CoreUsageStats>) => {
  id: string;
  type: string;
  namespace?: string;
  namespaces?: string[];
  migrationVersion?: import('@kbn/core/public').SavedObjectsMigrationVersion;
  coreMigrationVersion?: string;
  typeMigrationVersion?: string;
  version?: string;
  updated_at?: string;
  updated_by?: string;
  created_at?: string;
  created_by?: string;
  originId?: string;
  managed?: boolean;
  accessControl?: import('@kbn/core-saved-objects-server').SavedObjectAccessControl;
  references?: import('@kbn/core-saved-objects-server').SavedObjectReference[];
  attributes: CoreUsageStats;
};
