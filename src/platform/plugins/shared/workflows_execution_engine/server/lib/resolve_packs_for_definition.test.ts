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

  it('selects every pack under a contribution key a requires entry names, not just one', () => {
    const definition = {
      steps: [{ name: 'runAgent', type: 'ai.agent', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:ai-agent', { stepTypes: ['ai.agent'], requires: ['agent-builder'] }),
      packOf('agent-builder:cases', {}),
      packOf('agent-builder:observability', {}),
      packOf('workflow-steps:unrelated', { stepTypes: ['unrelated'] }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:ai-agent', 'agent-builder:cases', 'agent-builder:observability'])
    );
  });

  it('prefers a specific provides match over a same-named contribution key, when both exist', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:slack', { stepTypes: ['slack'], requires: ['spaces'] }),
      packOf('workflow-steps:spaces-runtime', { provides: ['spaces'] }),
      packOf('spaces:unrelated', {}),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:slack', 'workflow-steps:spaces-runtime'])
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

  it('returns [] for an atomic connector step type when no pack registers connector types', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
  });

  it('selects every pack flagged registersConnectorTypes for a step type no pack declares', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('alerting-rule-run:stack-connectors', { registersConnectorTypes: true }),
      packOf('alerting-rule-run:cases', { registersConnectorTypes: true }),
      packOf('workflow-steps:unrelated', { stepTypes: ['unrelated'] }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['alerting-rule-run:stack-connectors', 'alerting-rule-run:cases'])
    );
  });

  it('does not select connector packs when every step type is already pack-declared', () => {
    const definition = {
      steps: [{ name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} }],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:slack', { stepTypes: ['slack'] }),
      packOf('alerting-rule-run:stack-connectors', { registersConnectorTypes: true }),
    ];
    expect(resolvePacksForDefinition(definition, packs)).toEqual(['workflow-steps:slack']);
  });

  it('selects both the declaring pack and the connector packs when steps need both', () => {
    const definition = {
      steps: [
        { name: 'runAgent', type: 'agent.run', with: {} },
        { name: 'sendSlack', type: 'slack', connectorId: 'slack', with: {} },
      ],
    } as unknown as WorkflowYaml;
    const packs = [
      packOf('workflow-steps:agent', { stepTypes: ['agent.run'] }),
      packOf('alerting-rule-run:stack-connectors', { registersConnectorTypes: true }),
    ];
    expect(new Set(resolvePacksForDefinition(definition, packs))).toEqual(
      new Set(['workflow-steps:agent', 'alerting-rule-run:stack-connectors'])
    );
  });

  it('returns [] for the hardcoded console log step type when no pack registers connector types', () => {
    const definition = {
      steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
    } as unknown as WorkflowYaml;
    expect(resolvePacksForDefinition(definition, [])).toEqual([]);
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
