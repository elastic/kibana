/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TaskBundlePackManifest } from '@kbn/task-manager-plugin/server/task_process/supervisor';
import type { WorkflowYaml } from '@kbn/workflows';
import { resolvePacksForDefinition } from './resolve_packs_for_definition';

const packOf = (
  id: string,
  overrides: Partial<TaskBundlePackManifest> = {}
): TaskBundlePackManifest => ({ id, ...overrides });

describe('resolvePacksForDefinition', () => {
  it('selects the pack that declares a top-level step type', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [packOf('workflow-steps:slack', { stepTypes: ['slack'] })];
    expect(resolvePacksForDefinition(definition, packs)).toEqual(['workflow-steps:slack']);
  });

  it('selects nothing for step types no pack declares (internal or already-floor steps)', () => {
    const definition = {
      steps: [{ name: 'setValue', type: 'data.set', with: { key: 'a', value: 1 } }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [packOf('workflow-steps:slack')])).toEqual([]);
  });

  it('finds a step type nested inside a foreach block, not just top-level steps', () => {
    const definition = {
      steps: [
        {
          name: 'eachItem',
          type: 'foreach',
          foreach: '["a", "b"]',
          steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
        },
      ],
    } as unknown as WorkflowYaml;
    const packs = [packOf('workflow-steps:slack', { stepTypes: ['slack'] })];
    expect(resolvePacksForDefinition(definition, packs)).toEqual(['workflow-steps:slack']);
  });

  it('finds a step type nested inside an if/else block', () => {
    const definition = {
      steps: [
        {
          name: 'maybeSlack',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
          else: [{ name: 'sendOpenAi', type: 'openai', connectorId: 'openai', with: {} }],
        },
      ],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:slack', { stepTypes: ['slack'] }),
      packOf('workflow-steps:openai', { stepTypes: ['openai'] }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:slack', 'workflow-steps:openai'])
    );
  });

  it('adds the pack providing a service a selected pack requires, transitively', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:slack', { stepTypes: ['slack'], requires: ['connectorRegistry'] }),
      packOf('workflow-steps:connector-core', {
        provides: ['connectorRegistry'],
        requires: ['httpClient'],
      }),
      packOf('workflow-steps:http', { provides: ['httpClient'] }),
      packOf('workflow-steps:unrelated', { stepTypes: ['unrelated'] }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:slack', 'workflow-steps:connector-core', 'workflow-steps:http'])
    );
  });

  it('does not loop forever on a requires cycle between two packs', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:a', { stepTypes: ['slack'], provides: ['a'], requires: ['b'] }),
      packOf('workflow-steps:b', { provides: ['b'], requires: ['a'] }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:a', 'workflow-steps:b'])
    );
  });

  it('returns undefined (not []) for an atomic step type no pack declares, with an empty pack list', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toBeUndefined();
  });

  it('returns undefined (not []) when one atomic step type is uncovered, even if another is', () => {
    const definition = {
      steps: [
        { name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} },
        { name: 'runAgent', type: 'agent.run', with: {} },
      ],
    } as unknown as WorkflowYaml;
    const packs = [packOf('workflow-steps:slack', { stepTypes: ['slack'] })];
    // `agent.run` is atomic and not declared by any pack: this function cannot tell whether that
    // is a connector, or a custom step whose contribution has not been annotated yet, so it must
    // not persist a `packs: ['workflow-steps:slack']` that silently drops `agent.run`.
    expect(resolvePacksForDefinition(definition, packs)).toBeUndefined();
  });

  it('returns [] for a stock connector step type (a real @kbn/connector-specs id), no pack declares', () => {
    const definition = {
      // `.slack2` is `SLACK_CONNECTOR_TYPE_ID`, a real spec `@kbn/connector-specs` registers; its
      // executor is the actions plugin's own, already in the floor, not a `workflow-steps` pack.
      steps: [{ name: 'sendSlack', type: 'slack2', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
  });

  it('returns [] for a stock connector sub-action step type (connector id before the dot)', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack2.postMessage', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
  });

  it('returns [] for the hardcoded console log step type', () => {
    const definition = {
      steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
  });

  it('still returns undefined for a step type that is neither pack-declared nor a stock connector', () => {
    const definition = {
      // Not a real `@kbn/connector-specs` id: either a custom step not yet annotated, or a
      // system-connector step this function does not yet recognize, so it must fall back.
      steps: [{ name: 'runAgent', type: 'agent.run', with: {} }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toBeUndefined();
  });

  it('returns [] for a definition whose only steps are non-atomic (control flow and built-ins)', () => {
    const definition = {
      steps: [
        { name: 'setValue', type: 'data.set', with: { key: 'a', value: 1 } },
        {
          name: 'maybe',
          type: 'if',
          condition: 'true',
          steps: [{ name: 'es', type: 'elasticsearch.search', with: { index: 'a' } }],
        },
      ],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
  });
});
