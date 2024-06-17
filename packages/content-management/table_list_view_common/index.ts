/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectsReference } from '@kbn/content-management-content-editor';

export interface UserContentCommonSchema {
  id: string;
  updatedAt: string;
  createdBy?: string;
  managed?: boolean;
  references: SavedObjectsReference[];
  type: string;
  attributes: {
    title: string;
    description?: string;
  };
}
