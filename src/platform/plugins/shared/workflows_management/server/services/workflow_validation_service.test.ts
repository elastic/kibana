/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowValidationDeps } from './types';
import { WorkflowValidationService } from './workflow_validation_service';

const makeDeps = (
  listedTriggers: Array<{ id: string }> = []
): {
  deps: WorkflowValidationDeps;
  actionsClient: { getAll: jest.Mock };
  actionsClientWithRequest: { listTypes: jest.Mock };
} => {
  const actionsClient = { getAll: jest.fn().mockResolvedValue([]) };
  const actionsClientWithRequest = { listTypes: jest.fn().mockResolvedValue([]) };
  return {
    deps: {
      workflowsExtensions: {
        getAllTriggerDefinitions: () => listedTriggers as any,
      } as any,
      getActionsClient: jest.fn().mockResolvedValue(actionsClient) as any,
      getActionsClientWithRequest: jest.fn().mockResolvedValue(actionsClientWithRequest) as any,
    },
    actionsClient,
    actionsClientWithRequest,
  };
};

describe('WorkflowValidationService', () => {
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

      const result = await service.validateWorkflow(':::\nnot yaml', 'default', request);

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

      const result = await service.validateWorkflow(yaml, 'default', request);

      expect(result.valid).toBe(true);
    });
  });
});
