/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import React from 'react';
import { useSaveYamlWithConfirmation } from './use_save_yaml_with_confirmation';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { TestWrapper } from '../../../shared/test_utils/test_wrapper';
import type { WorkflowDependentsContextValue } from '../../workflow_dependents/model/workflow_dependents_context';
import { WorkflowDependentsContext } from '../../workflow_dependents/model/workflow_dependents_context';

const mockSaveYaml = jest.fn();
jest.mock('../../../entities/workflows/model/use_save_yaml', () => ({
  useSaveYaml: () => mockSaveYaml,
}));

let mockProposalContent: string | undefined;
jest.mock('../../ai_integration/active_proposal_manager', () => ({
  ...jest.requireActual('../../ai_integration/active_proposal_manager'),
  getActiveProposalContent: () => mockProposalContent,
}));

const workflowDto = (id: string) => ({
  id,
  name: 'Test Workflow',
  enabled: true,
  yaml: buildYaml(true),
  lastUpdatedAt: '2024-01-01T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'test-user',
  lastUpdatedBy: 'test-user',
  definition: null,
  valid: true,
});

const buildYaml = (enabled: boolean) =>
  `name: Test Workflow\nenabled: ${enabled}\ntriggers:\n  - type: manual\nsteps:\n  - name: log\n    type: console\n    with:\n      message: hello`;

describe('useSaveYamlWithConfirmation', () => {
  const confirmDisable = jest.fn();
  let store: ReturnType<typeof createMockStore>;
  let unmount: () => void;

  const renderSaves = (
    yamlEnabledEdits: boolean[],
    confirmBreakingChange?: WorkflowDependentsContextValue['confirmBreakingChange']
  ) => {
    store = createMockStore();
    store.dispatch(setWorkflow(workflowDto('wf-1')));
    yamlEnabledEdits.forEach((enabled) => store.dispatch(setYamlString(buildYaml(enabled))));
    // The header and the editor each save through their own hook.
    const useSaves = () => [
      useSaveYamlWithConfirmation(confirmDisable),
      useSaveYamlWithConfirmation(confirmDisable),
    ];
    const rendered = renderHook(useSaves, {
      wrapper: ({ children }) => (
        <TestWrapper store={store}>
          {confirmBreakingChange ? (
            <WorkflowDependentsContext.Provider
              value={{ confirmBreakingChange } as unknown as WorkflowDependentsContextValue}
            >
              {children}
            </WorkflowDependentsContext.Provider>
          ) : (
            children
          )}
        </TestWrapper>
      ),
    });
    unmount = rendered.unmount;
    return rendered.result.current;
  };
  const renderSave = (...args: Parameters<typeof renderSaves>) => renderSaves(...args)[0];

  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveYaml.mockResolvedValue(undefined);
    mockProposalContent = undefined;
  });

  it('saves without confirmation when the workflow stays enabled', async () => {
    await expect(renderSave([true])()).resolves.toBe(true);

    expect(confirmDisable).not.toHaveBeenCalled();
    expect(mockSaveYaml).toHaveBeenCalledWith({ id: 'wf-1', yamlString: buildYaml(true) });
  });

  it('saves after the user confirms disabling the workflow', async () => {
    confirmDisable.mockResolvedValue(true);

    await expect(renderSave([false])()).resolves.toBe(true);

    expect(confirmDisable).toHaveBeenCalledWith(['wf-1']);
    expect(mockSaveYaml).toHaveBeenCalled();
  });

  it('confirms a disable that is not yet in the computed workflow definition', async () => {
    confirmDisable.mockResolvedValue(true);

    await renderSave([true, false])();

    expect(confirmDisable).toHaveBeenCalledWith(['wf-1']);
  });

  it('does not save when the user cancels disabling the workflow', async () => {
    confirmDisable.mockResolvedValue(false);

    await expect(renderSave([false])()).resolves.toBe(false);

    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('does not save when the user cancels a change that breaks workflows calling this one', async () => {
    const confirmBreakingChange = jest.fn().mockResolvedValue(false);

    await expect(renderSave([true], confirmBreakingChange)()).resolves.toBe(false);

    expect(confirmBreakingChange).toHaveBeenCalled();
    expect(confirmDisable).not.toHaveBeenCalled();
    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('asks only for the disable when the draft disables a workflow that others run', async () => {
    confirmDisable.mockResolvedValue(true);
    const confirmBreakingChange = jest.fn().mockResolvedValue(true);

    await expect(renderSave([false], confirmBreakingChange)()).resolves.toBe(true);

    expect(confirmDisable).toHaveBeenCalledTimes(1);
    expect(confirmBreakingChange).not.toHaveBeenCalled();
    expect(mockSaveYaml).toHaveBeenCalled();
  });

  it('ignores a second save while the first is still checking', async () => {
    let finishCheck: (confirmed: boolean) => void = () => {};
    const confirmBreakingChange = jest.fn(
      () => new Promise<boolean>((resolve) => (finishCheck = resolve))
    );
    const save = renderSave([true], confirmBreakingChange);

    const first = save();
    await expect(save()).resolves.toBe(false);
    finishCheck(true);
    await expect(first).resolves.toBe(true);

    expect(confirmBreakingChange).toHaveBeenCalledTimes(1);
    expect(mockSaveYaml).toHaveBeenCalledTimes(1);
  });

  it('marks the save as being checked until it is sent', async () => {
    let finishCheck: (confirmed: boolean) => void = () => {};
    const confirmBreakingChange = jest.fn(
      () => new Promise<boolean>((resolve) => (finishCheck = resolve))
    );
    mockSaveYaml.mockImplementation(async () => {
      expect(store.getState().detail.isCheckingSave).toBe(false);
    });
    const save = renderSave([true], confirmBreakingChange)();

    expect(store.getState().detail.isCheckingSave).toBe(true);
    finishCheck(true);
    await expect(save).resolves.toBe(true);
    expect(store.getState().detail.isCheckingSave).toBe(false);
    expect(mockSaveYaml).toHaveBeenCalledTimes(1);
  });

  it('ignores a save while the previous one is being stored', async () => {
    const save = renderSave([true]);
    store.dispatch({ type: 'detail/saveYamlThunk/pending' });

    await expect(save()).resolves.toBe(false);
    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('checks the draft again when it changes while the check is pending', async () => {
    const editedYaml = `${buildYaml(true)}\n`;
    const confirmBreakingChange = jest
      .fn()
      .mockImplementationOnce(async () => {
        store.dispatch(setYamlString(editedYaml));
        return true;
      })
      .mockResolvedValueOnce(false);

    await expect(renderSave([true], confirmBreakingChange)()).resolves.toBe(false);

    expect(confirmBreakingChange).toHaveBeenNthCalledWith(1, buildYaml(true));
    expect(confirmBreakingChange).toHaveBeenNthCalledWith(2, editedYaml);
    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('ignores a save from another hook while the first is still checking', async () => {
    let finishCheck: (confirmed: boolean) => void = () => {};
    const confirmBreakingChange = jest.fn(
      () => new Promise<boolean>((resolve) => (finishCheck = resolve))
    );
    const [headerSave, editorSave] = renderSaves([true], confirmBreakingChange);

    const first = headerSave();
    await expect(editorSave()).resolves.toBe(false);
    finishCheck(true);
    await expect(first).resolves.toBe(true);

    expect(mockSaveYaml).toHaveBeenCalledTimes(1);
  });

  it('does not save when another workflow is opened while the check is pending', async () => {
    const confirmBreakingChange = jest.fn(async () => {
      store.dispatch(setWorkflow(workflowDto('wf-b')));
      return true;
    });

    await expect(renderSave([true], confirmBreakingChange)()).resolves.toBe(false);

    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('does not save when the editor closes while the check is pending', async () => {
    let finishCheck: (confirmed: boolean) => void = () => {};
    const confirmBreakingChange = jest.fn(
      () => new Promise<boolean>((resolve) => (finishCheck = resolve))
    );
    const save = renderSave([true], confirmBreakingChange)();

    unmount();
    expect(store.getState().detail.isCheckingSave).toBe(false);
    finishCheck(true);

    await expect(save).resolves.toBe(false);
    expect(mockSaveYaml).not.toHaveBeenCalled();
  });

  it('lets another editor on the same store save after one closes with its check unsettled', async () => {
    confirmDisable.mockReturnValueOnce(new Promise<boolean>(() => {}));
    renderSave([false])();
    const sharedStore = store;
    unmount();

    const { result } = renderHook(() => useSaveYamlWithConfirmation(confirmDisable), {
      wrapper: ({ children }) => <TestWrapper store={sharedStore}>{children}</TestWrapper>,
    });
    confirmDisable.mockResolvedValueOnce(true);

    await expect(result.current()).resolves.toBe(true);
    expect(mockSaveYaml).toHaveBeenCalledTimes(1);
  });

  it('checks and saves the draft with pending AI proposals accepted', async () => {
    const proposedYaml = `${buildYaml(
      true
    )}\ninputs:\n  - name: id\n    type: string\n    required: true`;
    mockProposalContent = proposedYaml;
    const confirmBreakingChange = jest.fn().mockResolvedValue(true);

    await expect(renderSave([true], confirmBreakingChange)()).resolves.toBe(true);

    expect(confirmBreakingChange).toHaveBeenCalledWith(proposedYaml);
    expect(mockSaveYaml).toHaveBeenCalledWith({ id: 'wf-1', yamlString: proposedYaml });
  });

  it('checks again when an AI proposal arrives while the check is pending', async () => {
    const proposedYaml = `${buildYaml(true)}\n`;
    const confirmBreakingChange = jest
      .fn()
      .mockImplementationOnce(async () => {
        mockProposalContent = proposedYaml;
        return true;
      })
      .mockResolvedValueOnce(true);

    await renderSave([true], confirmBreakingChange)();

    expect(confirmBreakingChange).toHaveBeenNthCalledWith(2, proposedYaml);
    expect(mockSaveYaml).toHaveBeenCalledWith({ id: 'wf-1', yamlString: proposedYaml });
  });
});
