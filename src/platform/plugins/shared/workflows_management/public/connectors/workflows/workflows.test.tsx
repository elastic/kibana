/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionTypeModel } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { WorkflowsActionParams, WorkflowsConfig, WorkflowsSecrets } from './types';
import { getConnectorType } from './workflows';

const CONNECTOR_TYPE_ID = '.workflows';
let connectorTypeModel: ActionTypeModel<WorkflowsConfig, WorkflowsSecrets, WorkflowsActionParams>;

beforeAll(() => {
  connectorTypeModel = getConnectorType();
});

describe('Workflows Connector', () => {
  describe('connector type configuration', () => {
    test('should have correct connector id', () => {
      expect(connectorTypeModel.id).toEqual(CONNECTOR_TYPE_ID);
    });

    test('should have correct action type title', () => {
      expect(connectorTypeModel.actionTypeTitle).toBe('Workflows');
    });

    test('should have select message', () => {
      expect(connectorTypeModel.selectMessage).toBe('Execute workflows when alerts are triggered.');
    });

    test('should have icon class', () => {
      expect(connectorTypeModel.iconClass).toBeDefined();
    });

    test('should have action connector fields', () => {
      expect(connectorTypeModel.actionConnectorFields).toBeDefined();
    });

    test('should have action params fields', () => {
      expect(connectorTypeModel.actionParamsFields).toBeDefined();
    });
  });

  describe('params validation', () => {
    test('should validate successful when workflowId is provided', async () => {
      const actionParams: WorkflowsActionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: 'test-workflow-123',
        },
      };

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect(result).toEqual({
        errors: {
          'subActionParams.workflowId': [],
        },
      });
    });

    test('should return error when workflowId is missing', async () => {
      const actionParams: WorkflowsActionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: '',
        },
      };

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect((result.errors as any)['subActionParams.workflowId']).toContain(
        'Workflow ID is required.'
      );
    });

    test('should return error when workflowId is undefined', async () => {
      const actionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: undefined,
        },
      } as any;

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect((result.errors as any)['subActionParams.workflowId']).toContain(
        'Workflow ID is required.'
      );
    });

    test('should return error when workflowId is null', async () => {
      const actionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: null,
        },
      } as any;

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect((result.errors as any)['subActionParams.workflowId']).toContain(
        'Workflow ID is required.'
      );
    });

    test('should handle missing subActionParams', async () => {
      const actionParams = {
        subAction: 'run',
      } as any;

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect((result.errors as any)['subActionParams.workflowId']).toContain(
        'Workflow ID is required.'
      );
    });

    test('should validate successfully with valid UUID workflowId', async () => {
      const actionParams: WorkflowsActionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: '550e8400-e29b-41d4-a716-446655440000',
        },
      };

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect(result).toEqual({
        errors: {
          'subActionParams.workflowId': [],
        },
      });
    });

    test('should validate successfully with alphanumeric workflowId', async () => {
      const actionParams: WorkflowsActionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: 'workflow_123-test',
        },
      };

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect(result).toEqual({
        errors: {
          'subActionParams.workflowId': [],
        },
      });
    });

    test('should handle empty string workflowId', async () => {
      const actionParams: WorkflowsActionParams = {
        subAction: 'run',
        subActionParams: {
          workflowId: '   ',
        },
      };

      const result = await connectorTypeModel.validateParams(actionParams, null);

      expect((result.errors as any)['subActionParams.workflowId']).toContain(
        'Workflow ID is required.'
      );
    });
  });
});
