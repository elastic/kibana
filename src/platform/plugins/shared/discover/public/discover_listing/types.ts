/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserContentCommonSchema } from '@kbn/content-management-table-list-view-common';

export interface DiscoverSavedObjectUserContent extends UserContentCommonSchema {
  type: 'search';
  id: string;
  updatedAt: string;
  createdAt: string;
  createdBy?: string;
  updatedBy?: string;
  references: Array<{ id: string; type: string; name: string }>;
  managed: boolean;
  attributes: {
    title: string;
    description?: string;
    // Add other search-specific attributes as needed
  };
}

