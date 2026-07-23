/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The Visualize group1 suite relies entirely on core `@kbn/scout` page objects
// (visualize, visEditor, visChart, inspector, filterBar, dashboard, discover), so
// no plugin-local fixture extension is required — re-export the base fixtures.
export { test, spaceTest } from '@kbn/scout';

export * as testData from './constants';
export { loadVisualizeSuiteDefaults, cleanupVisualizeSuiteDefaults } from './helpers';
