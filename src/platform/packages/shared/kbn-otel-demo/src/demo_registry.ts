/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DemoType, DemoConfig, DemoManifestGenerator, FailureScenario } from './types';
import {
  otelDemoConfig,
  SERVICE_DEFAULTS as OTEL_SERVICE_DEFAULTS,
} from './demos/otel_demo/config';
import { otelDemoManifests } from './demos/otel_demo/manifests';
import { OTEL_DEMO_SCENARIOS } from './demos/otel_demo/scenarios';
import {
  onlineBoutiqueConfig,
  SERVICE_DEFAULTS as BOUTIQUE_SERVICE_DEFAULTS,
} from './demos/online_boutique/config';
import { onlineBoutiqueManifests } from './demos/online_boutique/manifests';
import { ONLINE_BOUTIQUE_SCENARIOS } from './demos/online_boutique/scenarios';

/**
 * Registry of all available demo configurations
 */
export const DEMO_CONFIGS: Record<DemoType, DemoConfig> = {
  'otel-demo': otelDemoConfig,
  'online-boutique': onlineBoutiqueConfig,
};

/**
 * Registry of demo-specific manifest generators
 */
export const DEMO_MANIFESTS: Record<DemoType, DemoManifestGenerator> = {
  'otel-demo': otelDemoManifests,
  'online-boutique': onlineBoutiqueManifests,
};

/**
 * Registry of demo-specific failure scenarios
 */
export const DEMO_SCENARIOS: Record<DemoType, FailureScenario[]> = {
  'otel-demo': OTEL_DEMO_SCENARIOS,
  'online-boutique': ONLINE_BOUTIQUE_SCENARIOS,
};

/**
 * Registry of demo-specific service defaults (for scenario reset)
 */
export const DEMO_SERVICE_DEFAULTS: Record<DemoType, Record<string, Record<string, string>>> = {
  'otel-demo': OTEL_SERVICE_DEFAULTS,
  'online-boutique': BOUTIQUE_SERVICE_DEFAULTS,
};

/**
 * Get configuration for a specific demo
 */
export function getDemoConfig(type: DemoType): DemoConfig {
  const config = DEMO_CONFIGS[type];
  if (!config) {
    throw new Error(`Unknown demo type: ${type}`);
  }
  return config;
}

/**
 * Get manifest generator for a specific demo
 */
export function getDemoManifests(type: DemoType): DemoManifestGenerator {
  const manifests = DEMO_MANIFESTS[type];
  if (!manifests) {
    throw new Error(`Unknown demo type: ${type}`);
  }
  return manifests;
}

/**
 * Get failure scenarios for a specific demo
 */
export function getDemoScenarios(type: DemoType): FailureScenario[] {
  return DEMO_SCENARIOS[type] || [];
}

/**
 * Get service defaults for a specific demo
 */
export function getDemoServiceDefaults(type: DemoType): Record<string, Record<string, string>> {
  return DEMO_SERVICE_DEFAULTS[type] || {};
}

/**
 * Get a scenario by ID for a specific demo
 */
export function getScenarioById(type: DemoType, id: string): FailureScenario | undefined {
  const scenarios = getDemoScenarios(type);
  return scenarios.find((s) => s.id === id);
}

/**
 * Get all scenarios in a category for a specific demo
 */
export function getScenariosByCategory(
  type: DemoType,
  category: 'dramatic' | 'subtle'
): FailureScenario[] {
  const scenarios = getDemoScenarios(type);
  return scenarios.filter((s) => s.category === category);
}

/**
 * List all available demo types
 */
export function listAvailableDemos(): DemoType[] {
  return Object.keys(DEMO_CONFIGS) as DemoType[];
}

/**
 * List all scenario IDs for a specific demo
 */
export function listScenarioIds(type: DemoType): string[] {
  const scenarios = getDemoScenarios(type);
  return scenarios.map((s) => s.id);
}
