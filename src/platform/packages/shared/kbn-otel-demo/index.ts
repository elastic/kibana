/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Main functions
export { ensureOtelDemo, patchScenarios } from './src/ensure_otel_demo';

// Type definitions
export type {
  DemoType,
  DemoConfig,
  ServiceConfig,
  FailureScenario,
  FailureScenarioStep,
  ManifestOptions,
  DemoManifestGenerator,
} from './src/types';

// Demo registry
export {
  DEMO_CONFIGS,
  DEMO_MANIFESTS,
  DEMO_SCENARIOS,
  DEMO_SERVICE_DEFAULTS,
  getDemoConfig,
  getDemoManifests,
  getDemoScenarios,
  getDemoServiceDefaults,
  getScenarioById,
  listAvailableDemos,
} from './src/demo_registry';

// Re-export specific functions with different names to avoid conflicts
export { getScenariosByCategory as getDemoScenariosByCategory } from './src/demo_registry';
export { listScenarioIds as listDemoScenarioIds } from './src/demo_registry';

// Backward compatibility exports for OTel Demo (default demo)
import { OTEL_DEMO_SCENARIOS } from './src/demos/otel_demo/scenarios';

/** @deprecated Use getDemoScenarios('otel-demo') instead */
export const FAILURE_SCENARIOS = OTEL_DEMO_SCENARIOS;

/** @deprecated Use getDemoScenariosByCategory('otel-demo', category) instead */
export function getScenariosByCategory(category: 'dramatic' | 'subtle') {
  return OTEL_DEMO_SCENARIOS.filter((s) => s.category === category);
}

/** @deprecated Use listDemoScenarioIds('otel-demo') instead */
export function listScenarioIds(): string[] {
  return OTEL_DEMO_SCENARIOS.map((s) => s.id);
}
