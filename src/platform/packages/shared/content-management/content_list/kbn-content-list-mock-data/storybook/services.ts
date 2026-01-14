/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Mock favorites client for testing favorites filtering in stories.
 * Returns a static set of favorited item IDs.
 */
export const mockFavoritesClient = {
  getFavorites: async () => ({
    favoriteIds: ['dashboard-001', 'dashboard-003', 'vis-001', 'map-001'],
  }),
};
