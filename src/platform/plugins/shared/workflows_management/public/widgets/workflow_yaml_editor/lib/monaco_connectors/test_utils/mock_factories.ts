/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import type { HoverContext, StepContext } from '../../monaco_providers/provider_interfaces';

/**
 * Minimal step YAML that produces a real YAMLMap with `name`, `type`, and an
 * optional `with` block — used to populate `stepNode` and `typeNode` in tests
 * without resorting to type casts.
 */
const buildStepYaml = (stepType: string, withBlock: Record<string, unknown> = {}): string => {
  const withEntries = Object.entries(withBlock)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
    .join('\n');
  return `name: test_step\ntype: ${stepType}${withEntries ? `\nwith:\n${withEntries}` : ''}`;
};

/**
 * Parse a step YAML string and extract the `YAMLMap` node and the `type` Scalar node.
 */
const parseStepNodes = (yaml: string) => {
  const doc = YAML.parseDocument(yaml);
  const map = doc.contents;
  if (!YAML.isMap(map)) {
    throw new Error('Test setup: expected a YAMLMap from step yaml');
  }
  const typeNode = map.items.find(
    (item) => YAML.isScalar(item.key) && item.key.value === 'type'
  )?.value;
  if (!typeNode || !YAML.isScalar(typeNode)) {
    throw new Error('Test setup: expected a Scalar typeNode from step yaml');
  }
  return { stepNode: map, typeNode };
};

/**
 * Create a real `StepContext` with proper YAML nodes — no type casts needed.
 *
 * For tests that need a real `stepNode` from parsed YAML (e.g. elasticsearch
 * or kibana handlers), pass a `yaml` string. Otherwise a default minimal YAML
 * is generated from `stepType`.
 */
export const createMockStepContext = (
  overrides: Partial<StepContext> & { yaml?: string } = {}
): StepContext => {
  const { yaml: rawYaml, ...rest } = overrides;
  const stepType = rest.stepType ?? 'console';
  const yaml = rawYaml ?? buildStepYaml(stepType);
  const { stepNode, typeNode } = parseStepNodes(yaml);

  return {
    stepName: 'test_step',
    stepType,
    isInWithBlock: true,
    stepNode,
    typeNode,
    ...rest,
  };
};

/**
 * Create a real `HoverContext` with a real `YAML.Document` and properly typed
 * fields — no `as unknown as` casts needed.
 */
export const createMockHoverContext = (
  connectorType: string,
  stepContext?: StepContext,
  overrides: Partial<HoverContext> = {}
): HoverContext => ({
  kind: 'connector' as const,
  connectorType,
  stepContext,
  yamlPath: ['steps', '0', 'type'],
  currentValue: connectorType,
  position: { lineNumber: 1, column: 1 } as HoverContext['position'],
  model: { id: 'mock-model' } as HoverContext['model'],
  yamlDocument: YAML.parseDocument(`name: test\nsteps:\n  - name: s\n    type: ${connectorType}`),
  ...overrides,
});

/**
 * Helper to generate step YAML strings with an optional `with` block.
 * Used by tests that need to parse real YAML (elasticsearch, kibana handlers).
 */
export const makeStepYaml = (type: string, withBlock: Record<string, unknown> = {}): string => {
  return `- ${buildStepYaml(type, withBlock)}`;
};

/**
 * Parse a step list YAML (prefixed with `- name: ...`) and return the first
 * step's YAMLMap node — used by elasticsearch and kibana handler tests that
 * need a `stepNode` from a YAML sequence item.
 */
export const parseStepNodeFromListYaml = (yaml: string): YAML.YAMLMap => {
  const doc = YAML.parseDocument(yaml);
  if (!YAML.isSeq(doc.contents)) {
    throw new Error('Test setup: expected a YAMLSeq from list yaml');
  }
  const firstItem = doc.contents.items[0];
  if (!YAML.isMap(firstItem)) {
    throw new Error('Test setup: expected a YAMLMap as first sequence item');
  }
  return firstItem;
};
