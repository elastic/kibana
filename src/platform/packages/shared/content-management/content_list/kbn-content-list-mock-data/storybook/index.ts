/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Types
export { type VisualizationType, VISUALIZATION_TYPES, MOCK_USERS, type MockUser } from './types';

// Tags
export { type MockTag, MOCK_TAGS, TAG_MOCK_SEARCH_RESPONSE } from './tags';

// Dashboards
export {
  type DashboardMockItem,
  MOCK_DASHBOARDS,
  DASHBOARD_MOCK_SEARCH_RESPONSE,
} from './dashboards';

// Maps
export { type MapMockItem, MOCK_MAPS } from './maps';

// Files
export { type FileMockItem, MOCK_FILES } from './files';

// Visualizations
export { type VisualizationMockItem, MOCK_VISUALIZATIONS } from './visualizations';

// Helpers
export {
  type MockContentItem,
  type MockFindItemsConfig,
  type ItemWithStatus,
  createMockFindItems,
  createSimpleMockFindItems,
  mockFindDashboards,
  mockFindMaps,
  mockFindFiles,
  mockFindVisualizations,
  NULL_USER,
} from './helpers';

// User Profiles
export {
  MOCK_USER_PROFILES,
  MOCK_USER_PROFILES_MAP,
  mockUserProfileServices,
} from './user_profiles';

// Services
export { mockFavoritesClient } from './services';
