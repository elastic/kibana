/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import { getAddWorkflowRunPanelAction } from './add_workflow_run_panel_action';
import { openConfigFlyout } from './open_config_flyout';
import { registerAddWorkflowRunPanelAction } from './register';
import {
  WORKFLOW_RUN_EMBEDDABLE_TYPE,
  WORKFLOWS_DASHBOARD_RUN_PANEL_FLAG,
} from '../../../common/dashboard_run_panel/constants';

jest.mock('./open_config_flyout', () => ({ openConfigFlyout: jest.fn() }));

const createCore = (canRead = true) => {
  const core = coreMock.createStart();
  core.application.capabilities = {
    ...core.application.capabilities,
    workflowsManagement: { [WorkflowsManagementUiActions.read]: canRead },
  };
  return core;
};

const dashboard = { addNewPanel: jest.fn() };

describe('getAddWorkflowRunPanelAction', () => {
  it('is offered on dashboards when the flag is on and the user can read workflows', async () => {
    const action = getAddWorkflowRunPanelAction(createCore(), () => true);
    await expect(action.isCompatible?.({ embeddable: dashboard })).resolves.toBe(true);
  });

  it('is hidden while the feature flag is off', async () => {
    const action = getAddWorkflowRunPanelAction(createCore(), () => false);
    await expect(action.isCompatible?.({ embeddable: dashboard })).resolves.toBe(false);
  });

  it('is hidden from users who cannot read workflows', async () => {
    const action = getAddWorkflowRunPanelAction(createCore(false), () => true);
    await expect(action.isCompatible?.({ embeddable: dashboard })).resolves.toBe(false);
  });

  it('is hidden in containers that cannot add panels', async () => {
    const action = getAddWorkflowRunPanelAction(createCore(), () => true);
    await expect(action.isCompatible?.({ embeddable: {} })).resolves.toBe(false);
  });

  it('adds the configured panel titled with the workflow name', async () => {
    const action = getAddWorkflowRunPanelAction(createCore(), () => true);
    await action.execute({ embeddable: dashboard });

    const [{ onSave }] = (openConfigFlyout as jest.Mock).mock.calls[0];
    onSave({ workflow_id: 'wf-1', input_mappings: [] }, 'Isolate host');

    expect(dashboard.addNewPanel).toHaveBeenCalledWith({
      panelType: WORKFLOW_RUN_EMBEDDABLE_TYPE,
      serializedState: { workflow_id: 'wf-1', input_mappings: [], title: 'Isolate host' },
    });
  });
});

describe('registerAddWorkflowRunPanelAction', () => {
  it('follows the feature flag after registration', async () => {
    const core = createCore();
    const flag$ = new BehaviorSubject(false);
    core.featureFlags.getBooleanValue$.mockImplementation((name, fallback) =>
      name === WORKFLOWS_DASHBOARD_RUN_PANEL_FLAG ? flag$ : new BehaviorSubject(fallback)
    );
    const uiActions = uiActionsPluginMock.createStartContract();

    const subscription = registerAddWorkflowRunPanelAction(core, uiActions);
    const [, , loadAction] = (uiActions.addTriggerActionAsync as jest.Mock).mock.calls[0];
    const action = await loadAction();

    await expect(action.isCompatible({ embeddable: dashboard })).resolves.toBe(false);
    flag$.next(true);
    await expect(action.isCompatible({ embeddable: dashboard })).resolves.toBe(true);

    subscription.unsubscribe();
  });
});
