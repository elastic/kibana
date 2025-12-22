/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Storybook configuration
export { TITLE, URL } from './constants';

// Re-export mock data from the centralized mocks package
export {
  // Types
  type VisualizationType,
  VISUALIZATION_TYPES,
  MOCK_USERS,
  type MockUser,

  // Tags
  type MockTag,
  MOCK_TAGS,
  TAG_MOCK_SEARCH_RESPONSE,

  // Dashboards
  type DashboardMockItem,
  MOCK_DASHBOARDS,
  DASHBOARD_MOCK_SEARCH_RESPONSE,

  // Maps
  type MapMockItem,
  MOCK_MAPS,

  // Files
  type FileMockItem,
  MOCK_FILES,

  // Visualizations
  type VisualizationMockItem,
  MOCK_VISUALIZATIONS,

  // Helpers
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

  // User Profiles
  MOCK_USER_PROFILES,
  MOCK_USER_PROFILES_MAP,
  mockUserProfileServices,
} from '@kbn/content-list-mock-data';
