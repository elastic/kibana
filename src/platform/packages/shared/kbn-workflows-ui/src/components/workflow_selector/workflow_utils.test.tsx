/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowListDto } from '@kbn/workflows';
import {
  getSelectedWorkflowDisabledError,
  processWorkflowsToOptions,
  type WorkflowSelectorConfig,
} from './workflow_utils';

const createMockWorkflow = (
  id: string,
  enabled: boolean,
  tags?: string[]
): WorkflowListDto['results'][number] => ({
  id,
  name: `workflow-${id}`,
  description: `Description for ${id}`,
  enabled,
  definition: {
    version: '1',
    name: `workflow-${id}`,
    enabled,
    triggers: [{ type: 'manual' }],
    steps: [],
    tags,
  },
  createdAt: '2023-01-01T00:00:00Z',
  history: [],
  valid: true,
  tags,
});

describe('workflow_utils', () => {
  describe('processWorkflowsToOptions', () => {
    it('converts workflows to options with correct structure', () => {
      const workflows = [
        createMockWorkflow('1', true, ['tag1', 'tag2']),
        createMockWorkflow('2', false),
      ];

      const options = processWorkflowsToOptions(workflows, '1');

      expect(options).toHaveLength(2);
      expect(options[0]).toMatchObject({
        id: '1',
        name: 'workflow-1',
        label: 'workflow-1',
        disabled: false,
        checked: 'on',
      });
      expect(options[1]).toMatchObject({
        id: '2',
        disabled: true,
        checked: undefined,
      });
    });

    it('applies filter function', () => {
      const workflows = [createMockWorkflow('1', true), createMockWorkflow('2', true)];

      const config: WorkflowSelectorConfig = {
        filterFunction: (wfs) => wfs.filter((w) => w.id === '1'),
      };

      const options = processWorkflowsToOptions(workflows, undefined, config);
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('1');
    });

    it('applies validation function', () => {
      const workflows = [createMockWorkflow('1', true)];

      const config: WorkflowSelectorConfig = {
        validationFunction: () => ({ severity: 'error', message: 'Invalid' }),
      };

      const options = processWorkflowsToOptions(workflows, undefined, config);
      expect(options[0].validationResult).toEqual({ severity: 'error', message: 'Invalid' });
    });
  });

  describe('getSelectedWorkflowDisabledError', () => {
    it('returns null when no workflow is selected', () => {
      const workflows = [createMockWorkflow('1', false)];
      expect(getSelectedWorkflowDisabledError(workflows, undefined)).toBeNull();
    });

    it('returns null when selected workflow is enabled', () => {
      const workflows = [createMockWorkflow('1', true)];
      expect(getSelectedWorkflowDisabledError(workflows, '1')).toBeNull();
    });

    it('returns error message when selected workflow is disabled', () => {
      const workflows = [createMockWorkflow('1', false)];
      const error = getSelectedWorkflowDisabledError(workflows, '1');
      expect(error).toBeTruthy();
      expect(typeof error).toBe('string');
    });

    it('uses custom error message when provided', () => {
      const workflows = [createMockWorkflow('1', false)];
      const customError = 'Custom error message';
      const error = getSelectedWorkflowDisabledError(workflows, '1', customError);
      expect(error).toBe(customError);
    });
  });
});
