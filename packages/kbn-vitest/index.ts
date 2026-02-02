/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Preset configuration
export {
  createKbnVitestPreset,
  createKbnUnitTestPreset,
  createKbnIntegrationTestPreset,
  createPluginVitestConfig,
  type KbnVitestPresetOptions,
  type PluginVitestConfigOptions,
} from './src/preset';

// Vite plugins for Jest compatibility and special file handling
export { jestCompatPlugin, rawTextPlugin } from './src/plugins';

// Mocks
export { styleMock } from './src/_mocks/style_mock';
export { cssModuleMock } from './src/_mocks/css_module_mock';
export { fileMock } from './src/_mocks/file_mock';
export { MockWorker } from './src/_mocks/worker_mock';
export { apmAgentMock } from './src/_mocks/apm_agent_mock';
