/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectReference, SavedObjectsNamespaceType } from '@kbn/core/public';

export interface SavedObjectsManagementRecord {
  type: string;
  id: string;
  meta: {
    icon: string;
    title: string;
    namespaceType: SavedObjectsNamespaceType;
    hiddenType: boolean;
  };
  references: SavedObjectReference[];
  namespaces?: string[];
}
