/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CustomTriggerSchemaConfig } from '@kbn/workflows';
import { z } from '@kbn/zod/v4';
import type { WorkflowValidationDeps } from './types';
import { WorkflowValidationService } from './workflow_validation_service';

interface MakeDepsOptions {
  /** Connector types the request can see, as `listTypes` returns them. */
  listedConnectorTypes?: Array<Record<string, unknown>>;
  /** Registered step definitions, keyed by step type. */
  stepDefinitions?: Record<string, { outputSchema?: z.ZodType }>;
}

const makeDeps = (
  listedTriggers: CustomTriggerSchemaConfig[] = [],
  { listedConnectorTypes = [], stepDefinitions = {} }: MakeDepsOptions = {}
): {
  deps: WorkflowValidationDeps;
  actionsClient: { getAll: jest.Mock };
  actionsClientWithRequest: { listTypes: jest.Mock };
} => {
  const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
  const actionsClientWithRequest = {
    listTypes: jest.fn().mockResolvedValue(listedConnectorTypes),
  };
  return {
    deps: {
      workflowsExtensions: {
        getAllTriggerDefinitions: () => listedTriggers as any,
        getTriggerDefinition: (triggerType: string) =>
          listedTriggers.find(({ id }) => id === triggerType) as any,
        getStepDefinition: (stepTypeId: string) => stepDefinitions[stepTypeId] as any,
      } as any,
      getActionsClient: jest.fn().mockResolvedValue(actionsClient) as any,
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest) as any,
      getCoreStart: () =>
        ({
          featureFlags: {
            getBooleanValue: jest.fn().mockResolvedValue(false),
          },
        } as any),
    },
    actionsClient,
    actionsClientWithRequest,
  };
};

const slackConnectorType = {
  id: '.slack',
  name: 'Slack',
  enabled: true,
  enabledInConfig: true,
  enabledInLicense: true,
  minimumLicenseRequired: 'gold',
  supportedFeatureIds: ['workflows'],
};

const slackWorkflowYaml = (reference: string) =>
  [
    'name: connector-output',
    'enabled: true',
    'triggers:',
    '  - type: manual',
    'steps:',
    '  - name: notify',
    '    type: slack',
    '    connector-id: my-slack',
    '    with:',
    '      message: "hello"',
    '  - name: log',
    '    type: console',
    '    with:',
    `      message: "${reference}"`,
    '',
  ].join('\n');

describe('WorkflowValidationService', () => {
  describe('getRegisteredCustomTriggerDefinitions', () => {
    it('returns triggers from workflows extensions', () => {
      const { deps } = makeDeps([{ id: 'cases.caseUpdated' }]);
      const service = new WorkflowValidationService(deps);

      expect(service.getRegisteredCustomTriggerDefinitions()).toEqual([
        { id: 'cases.caseUpdated' },
      ]);
    });

    it('returns an empty array when no triggers are registered', () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);

      expect(service.getRegisteredCustomTriggerDefinitions()).toEqual([]);
    });
  });

  describe('getAvailableConnectors', () => {
    it('delegates to the library helper with the plumbed clients and spaceId', async () => {
      const { deps, actionsClient, actionsClientWithRequest } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const result = await service.getAvailableConnectors('my-space', request);

      expect(actionsClient.getAll).toHaveBeenCalledWith('my-space');
      expect(actionsClientWithRequest.listTypes).toHaveBeenCalled();
      expect(result).toEqual({ connectorTypes: {}, totalConnectors: 0 });
    });
  });

  describe('getWorkflowZodSchema', () => {
    it('fetches available connectors once and produces a schema', async () => {
      const { deps, actionsClient } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const schema = await service.getWorkflowZodSchema({ loose: false }, 'default', request);

      expect(schema).toBeDefined();
      expect(typeof (schema as any).parse).toBe('function');
      expect(actionsClient.getAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateWorkflow', () => {
    it('returns an invalid result with parse errors for malformed YAML', async () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const result = await service.validateWorkflow(':::\nnot yaml', 'default', request, {
        includeVariableRules: false,
      });

      expect(result.valid).toBe(false);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    });

    it('returns a valid result for a well-formed workflow YAML', async () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const yaml = [
        'name: ok',
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "hello"',
        '',
      ].join('\n');

      const result = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: false,
      });

      expect(result.valid).toBe(true);
    });

    it('reports variable diagnostics for an unresolvable reference', async () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const yaml = [
        'name: bad-reference',
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'consts:',
        '  greeting: hello',
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "{{ consts.missing }}"',
        '',
      ].join('\n');

      const result = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: true,
      });

      expect(result.diagnostics.some(({ source }) => source === 'variable')).toBe(true);
    });

    it('reports no variable diagnostics for a reference that resolves', async () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const yaml = [
        'name: good-reference',
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'consts:',
        '  greeting: hello',
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "{{ consts.greeting }}"',
        '',
      ].join('\n');

      const result = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: true,
      });

      expect(result.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
    });

    it('resolves a reference against a registered step output', async () => {
      // The registered definition must win over the connector contract for the
      // same step type: `known` exists only on the definition, `channel` only on
      // the connector.
      const { deps } = makeDeps([], {
        listedConnectorTypes: [slackConnectorType],
        stepDefinitions: { slack: { outputSchema: z.object({ known: z.string() }) } },
      });
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const resolves = await service.validateWorkflow(
        slackWorkflowYaml('{{ steps.notify.output.known }}'),
        'default',
        request,
        { includeVariableRules: true }
      );
      const fromConnectorOnly = await service.validateWorkflow(
        slackWorkflowYaml('{{ steps.notify.output.channel }}'),
        'default',
        request,
        { includeVariableRules: true }
      );

      expect(resolves.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
      expect(
        fromConnectorOnly.diagnostics.filter(({ source }) => source === 'variable')
      ).not.toEqual([]);
    });

    it('resolves a reference against a connector the request can see', async () => {
      // `slack` exists only because `listTypes` reports it, so this covers the
      // request-scoped connector contracts rather than the static set.
      const { deps } = makeDeps([], { listedConnectorTypes: [slackConnectorType] });
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const resolves = await service.validateWorkflow(
        slackWorkflowYaml('{{ steps.notify.output.channel }}'),
        'default',
        request,
        { includeVariableRules: true }
      );
      const missing = await service.validateWorkflow(
        slackWorkflowYaml('{{ steps.notify.output.missing }}'),
        'default',
        request,
        { includeVariableRules: true }
      );

      expect(resolves.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
      expect(missing.diagnostics.filter(({ source }) => source === 'variable')).not.toEqual([]);
    });

    it('does not apply variable rules, so a run is not blocked by them', async () => {
      const { deps } = makeDeps();
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      // `invalidVariableReference` is an error, and inline execution, workflow
      // test and step test all throw when the result is invalid.
      const yaml = [
        'name: bad-reference',
        'enabled: true',
        'triggers:',
        '  - type: manual',
        'consts:',
        '  greeting: hello',
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "{{ consts.missing }}"',
        '',
      ].join('\n');

      const gate = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: false,
      });
      const diagnostics = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: true,
      });

      expect(gate.diagnostics.filter(({ source }) => source === 'variable')).toEqual([]);
      expect(gate.valid).toBe(true);
      expect(diagnostics.diagnostics.some(({ source }) => source === 'variable')).toBe(true);
    });

    it('fails save when a requiresConnectorId trigger is missing connector-id', async () => {
      const connectorEventTriggerId = 'example.connector_event';
      const { deps } = makeDeps([{ id: connectorEventTriggerId, requiresConnectorId: true }]);
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const yaml = [
        'name: connector-event',
        'enabled: true',
        'triggers:',
        `  - type: ${connectorEventTriggerId}`,
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "hello"',
        '',
      ].join('\n');

      const result = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: false,
      });

      expect(result.valid).toBe(false);
      expect(result.diagnostics.some((d) => d.source === 'schema')).toBe(true);
      expect(result.diagnostics.some((d) => d.message.includes('connector-id'))).toBe(true);
    });

    it('accepts a requiresConnectorId trigger when connector-id is present', async () => {
      const connectorEventTriggerId = 'example.connector_event';
      const { deps } = makeDeps([{ id: connectorEventTriggerId, requiresConnectorId: true }]);
      const service = new WorkflowValidationService(deps);
      const request = {} as any;

      const yaml = [
        'name: connector-event',
        'enabled: true',
        'triggers:',
        `  - type: ${connectorEventTriggerId}`,
        '    connector-id: webhook-1',
        'steps:',
        '  - name: step-one',
        '    type: console',
        '    with:',
        '      message: "hello"',
        '',
      ].join('\n');

      const result = await service.validateWorkflow(yaml, 'default', request, {
        includeVariableRules: false,
      });

      expect(result.valid).toBe(true);
    });
  });
});
