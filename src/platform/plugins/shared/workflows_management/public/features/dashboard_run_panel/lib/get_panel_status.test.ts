/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowDetailDto, WorkflowYaml } from '@kbn/workflows';
import type { WorkflowsManagementCapabilities } from '@kbn/workflows-ui';
import { getPanelStatus } from './get_panel_status';

const allowed: WorkflowsManagementCapabilities = {
  canCreateWorkflow: false,
  canReadWorkflow: true,
  canReadManagedWorkflow: false,
  canUpdateWorkflow: false,
  canDeleteWorkflow: false,
  canExecuteWorkflow: true,
  canReadWorkflowExecution: true,
  canReadManagedWorkflowExecution: false,
  canCancelWorkflowExecution: false,
};

const manualDefinition = {
  triggers: [{ type: 'manual' }],
  steps: [],
} as unknown as WorkflowYaml;

const workflow = (overrides: Partial<WorkflowDetailDto> = {}): WorkflowDetailDto =>
  ({
    id: 'wf-1',
    name: 'Isolate host',
    enabled: true,
    valid: true,
    definition: manualDefinition,
    ...overrides,
  } as WorkflowDetailDto);

const status = (params: Partial<Parameters<typeof getPanelStatus>[0]> = {}) =>
  getPanelStatus({
    capabilities: allowed,
    workflow: workflow(),
    isLoading: false,
    error: undefined,
    isNotFound: false,
    ...params,
  });

describe('getPanelStatus', () => {
  it('is ready for an enabled, valid workflow with a manual trigger', () => {
    expect(status().type).toBe('ready');
  });

  it('names every missing privilege before loading anything', () => {
    expect(
      status({
        capabilities: { ...allowed, canExecuteWorkflow: false, canReadWorkflowExecution: false },
        isNotFound: true,
      })
    ).toEqual({ type: 'missing_privileges', privileges: ['execute', 'readExecution'] });
  });

  it('reports a workflow that no longer exists', () => {
    expect(
      status({ workflow: undefined, isNotFound: true, error: new Error('Not Found') }).type
    ).toBe('not_found');
  });

  it('reports a workflow the viewer may not run under its access control', () => {
    expect(
      status({
        workflow: workflow({
          permissions: { read: true, execute: false, edit: false, manage: false },
        }),
      }).type
    ).toBe('not_runnable_by_user');
  });

  it('reports disabled, invalid and non-manual workflows', () => {
    expect(status({ workflow: workflow({ enabled: false }) }).type).toBe('disabled');
    expect(status({ workflow: workflow({ valid: false }) }).type).toBe('invalid');
    expect(
      status({
        workflow: workflow({
          definition: { triggers: [{ type: 'scheduled' }], steps: [] } as unknown as WorkflowYaml,
        }),
      }).type
    ).toBe('no_manual_trigger');
  });

  it('waits while the workflow loads', () => {
    expect(status({ workflow: undefined, isLoading: true }).type).toBe('loading');
  });
});
