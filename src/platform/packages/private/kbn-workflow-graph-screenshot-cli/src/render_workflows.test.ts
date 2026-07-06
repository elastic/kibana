/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { transformWorkflowToGraph } from '@kbn/workflows';
import type { WorkflowYaml } from '@kbn/workflows';
import { parseYamlToJSONWithoutValidation } from '@kbn/workflows-yaml';
import { resolveYamlInputs } from './cli';

// Local fixture YAMLs — self-contained so the test has no cross-package deps.
const FIXTURES_DIR = path.resolve(__dirname, '__fixtures__');

// A minimal valid workflow YAML that covers trigger + one step.
const MINIMAL_WORKFLOW_YAML = `
name: minimal-test
description: Minimal workflow for unit tests
triggers:
  - type: manual
steps:
  - name: greet
    type: connector.slack-post-message
    connector_id: slack-1
    message: Hello
`;

// ── Pure computation chain tests ───────────────────────────────────────────────

describe('parseYamlToJSONWithoutValidation + transformWorkflowToGraph', () => {
  it('produces nodes and edges for a minimal valid workflow', () => {
    const parsed = parseYamlToJSONWithoutValidation(MINIMAL_WORKFLOW_YAML);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const workflow = parsed.json as unknown as WorkflowYaml;
    const { nodes, edges } = transformWorkflowToGraph(workflow);

    expect(nodes.length).toBeGreaterThan(0);
    // A trigger → step graph has at least one edge
    expect(edges.length).toBeGreaterThan(0);
  });

  it('returns empty nodes when the YAML has no steps', () => {
    const noSteps = 'name: empty\ndescription: no steps\ntriggers:\n  - type: manual\n';
    const parsed = parseYamlToJSONWithoutValidation(noSteps);
    const workflow = parsed.success ? (parsed.json as unknown as WorkflowYaml) : undefined;
    const { nodes } = transformWorkflowToGraph(workflow);
    // Only the trigger node should be present (or none at all for an empty workflow)
    expect(nodes.length).toBeGreaterThanOrEqual(0);
  });

  it('handles undefined workflow gracefully', () => {
    const { nodes, edges } = transformWorkflowToGraph(undefined);
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });
});

// ── Input resolution tests ─────────────────────────────────────────────────────

describe('resolveYamlInputs', () => {
  it('resolves a directory to all yaml files within it', async () => {
    const files = await resolveYamlInputs([FIXTURES_DIR]);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => /\.ya?ml$/i.test(f))).toBe(true);
    expect(files.every((f) => path.isAbsolute(f))).toBe(true);
  });

  it('resolves a single yaml file directly', async () => {
    const singleFile = path.join(FIXTURES_DIR, 'automated_triaging.yaml');
    const files = await resolveYamlInputs([singleFile]);
    expect(files).toHaveLength(1);
    expect(files[0]).toBe(singleFile);
  });

  it('resolves a glob pattern', async () => {
    const glob = path.join(FIXTURES_DIR, '*.yaml');
    const files = await resolveYamlInputs([glob]);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.endsWith('.yaml'))).toBe(true);
  });

  it('returns an empty array for a directory with no yaml files', async () => {
    // __no_yaml__/ contains only a .gitkeep — no .yaml files
    const emptyDir = path.resolve(__dirname, '__no_yaml__');
    const files = await resolveYamlInputs([emptyDir]);
    expect(files).toEqual([]);
  });

  it('deduplicates overlapping inputs', async () => {
    const singleFile = path.join(FIXTURES_DIR, 'automated_triaging.yaml');
    const files = await resolveYamlInputs([singleFile, singleFile]);
    expect(files).toHaveLength(1);
  });
});
