/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Browser automation tools
export {
  scoutNavigate,
  scoutClick,
  scoutType,
  scoutSnapshot,
  scoutScreenshot,
  scoutWaitFor,
  scoutGetUrl,
  scoutGetTitle,
  scoutReload,
} from './browser';

// Authentication tools
export {
  scoutLogin,
  scoutLogout,
  scoutGetAuthStatus,
  scoutLoginAsAdmin,
  scoutLoginAsViewer,
  scoutLoginAsPrivileged,
} from './auth';

// EUI component tools
export { scoutEuiComponent, scoutListEuiComponents } from './eui';

// API service tools
export { scoutListApiServices } from './api';

// Test generation tools
export {
  scoutGenerateTestFile,
  scoutSuggestAssertions,
  scoutFindSelectors,
} from './test_generation';

// Migration tools
export {
  scoutAnalyzeCypressPatterns,
  scoutConvertCypressCommand,
  scoutGenerateMigrationPlan,
  scoutAssessMigrationRisk,
  scoutSuggestTestConversion,
  scoutCheckTestCoverage,
  scoutGenerateUnitOrIntegrationTest,
} from './migration';

// Code generation tools
export { scoutGeneratePageObjectCode, scoutGenerateApiServiceCode } from './code_generation';

// Debugging tools
export {
  scoutGetConsoleLogs,
  scoutGetNetworkActivity,
  scoutCompareSnapshots,
  scoutSuggestFix,
  scoutAnalyzeWaitFailure,
} from './debugging';

// Test analyzer tools
export { scoutAnalyzeTestSuitability, scoutAnalyzeTestSuite } from './test_analyzer';

// Test execution tools
export { scoutRunTest, scoutWatchTest, scoutGetTestResults } from './test_execution';

// File operation tools
export {
  scoutWriteFile,
  scoutReadFile,
  scoutSuggestFileLocation,
  scoutFindExistingFiles,
} from './file_operations';
