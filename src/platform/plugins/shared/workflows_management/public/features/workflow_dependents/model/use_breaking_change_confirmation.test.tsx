/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useBreakingChangeConfirmation } from './use_breaking_change_confirmation';
import { useWorkflowDependents } from './use_workflow_dependents';
import type { ConfirmBreakingChange } from './workflow_dependents_context';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import type { DependentImpact } from '../../../../common/lib/workflow_dependents/types';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';
import { createTestQueryClient } from '../../../shared/test_utils';

const SAVED_YAML = 'name: Alert context\nsteps: []';

const caller = (overrides: Partial<DependentImpact>): DependentImpact => ({
  workflowId: 'triage',
  workflowName: 'Triage',
  enabled: true,
  status: 'breaking',
  callSites: [],
  issues: [
    {
      kind: 'missingRequiredInput',
      severity: 'breaking',
      stepName: 'get_context',
      field: 'tenant',
      isNew: true,
    },
  ],
  upstream: [],
  ...overrides,
});

const impact = (
  dependents: DependentImpact[],
  indirectBreaking = 0
): WorkflowDependentsImpactResponse => ({
  analysis: {
    contractChanges: [],
    dependents,
    summary: { direct: dependents.length, breaking: 0, warning: 0, unknown: 0, indirectBreaking },
  },
  calledWorkflows: [],
});

describe('useBreakingChangeConfirmation', () => {
  let confirmBreakingChange: ConfirmBreakingChange;
  let draft: string;
  let services: ReturnType<typeof createStartServicesMock>;
  const onReviewImpact = jest.fn();

  const Harness = () => {
    const hook = useBreakingChangeConfirmation(onReviewImpact);
    confirmBreakingChange = hook.confirmBreakingChange;
    return hook.confirmModal;
  };

  let store: ReturnType<typeof createMockStore>;

  const workflowDto = (id: string, name: string) => ({
    id,
    name,
    enabled: true,
    yaml: SAVED_YAML,
    lastUpdatedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'test-user',
    lastUpdatedBy: 'test-user',
    definition: null,
    valid: true,
  });

  const renderWithDraft = (draftYaml: string) => {
    draft = draftYaml;
    store = createMockStore();
    store.dispatch(setWorkflow(workflowDto('alert-context', 'Alert context')));
    store.dispatch(setYamlString(draftYaml));
    return render(
      <TestProvider services={services} store={store}>
        <Harness />
      </TestProvider>
    );
  };

  const openConfirmation = async (): Promise<{ confirmation: Promise<boolean> }> => {
    let confirmation: Promise<boolean> = Promise.resolve(false);
    act(() => {
      confirmation = confirmBreakingChange(draft);
    });
    await screen.findByTestId('workflowBreakingChangeConfirmModal');
    return { confirmation };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    services = createStartServicesMock();
  });

  it('saves without asking the server when there are no unsaved changes', async () => {
    renderWithDraft(SAVED_YAML);

    await expect(confirmBreakingChange(draft)).resolves.toBe(true);

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('saves without a prompt when only turned-off callers break', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({ enabled: false })]));
    renderWithDraft(`${SAVED_YAML}\n`);

    await expect(confirmBreakingChange(draft)).resolves.toBe(true);

    expect(services.http.post).toHaveBeenCalledWith(
      '/internal/workflows/workflow/alert-context/_dependents_impact',
      expect.objectContaining({ body: JSON.stringify({ yaml: `${SAVED_YAML}\n` }), version: '1' })
    );
    expect(screen.queryByTestId('workflowBreakingChangeConfirmModal')).not.toBeInTheDocument();
  });

  it('lists the callers the save breaks and saves when the user confirms', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({})], 2));
    renderWithDraft(`${SAVED_YAML}\n`);

    const { confirmation } = await openConfirmation();

    expect(screen.getByText('Save changes that break 1 workflow?')).toBeInTheDocument();
    expect(
      screen.getByText('Doesn’t send the input "tenant", which Alert context requires', {
        exact: false,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText('2 more workflows further up the chain run these', { exact: false })
    ).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await expect(confirmation).resolves.toBe(true);
  });

  it('cancels the save and opens the panel when the user reviews what breaks', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({})]));
    renderWithDraft(`${SAVED_YAML}\n`);

    const { confirmation } = await openConfirmation();
    await userEvent.click(screen.getByTestId('workflowBreakingChangeReviewButton'));

    await expect(confirmation).resolves.toBe(false);
    expect(onReviewImpact).toHaveBeenCalled();
  });

  it('warns that callers could not be checked when the analysis fails', async () => {
    (services.http.post as jest.Mock).mockRejectedValue(new Error('boom'));
    renderWithDraft(`${SAVED_YAML}\n`);

    const { confirmation } = await openConfirmation();

    expect(
      screen.getByText('Save without checking the workflows that run this one?')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await expect(confirmation).resolves.toBe(true);
  });

  it('checks again on every save instead of reusing an earlier result', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([]));
    renderWithDraft(`${SAVED_YAML}\n`);

    await confirmBreakingChange(draft);
    await confirmBreakingChange(draft);

    expect(services.http.post).toHaveBeenCalledTimes(2);
  });

  it('lists at most 10 callers and counts the rest', async () => {
    const callers = Array.from({ length: 12 }, (_, index) =>
      caller({ workflowId: `caller-${index}`, workflowName: `Caller ${index}` })
    );
    (services.http.post as jest.Mock).mockResolvedValue(impact(callers));
    renderWithDraft(`${SAVED_YAML}\n`);

    await openConfirmation();

    expect(screen.getByText('Caller 9')).toBeInTheDocument();
    expect(screen.queryByText('Caller 10')).not.toBeInTheDocument();
    expect(screen.getByText('and 2 more')).toBeInTheDocument();
  });

  it('cancels the save when another workflow is opened while the dialog is open', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({})]));
    renderWithDraft(`${SAVED_YAML}\n`);

    const { confirmation } = await openConfirmation();
    act(() => {
      store.dispatch(setWorkflow(workflowDto('triage', 'Triage')));
    });

    await expect(confirmation).resolves.toBe(false);
    expect(screen.queryByTestId('workflowBreakingChangeConfirmModal')).not.toBeInTheDocument();
  });

  it('does not ask about a workflow that was closed while its check ran', async () => {
    (services.http.post as jest.Mock).mockImplementation(async () => {
      store.dispatch(setWorkflow(workflowDto('triage', 'Triage')));
      return impact([caller({})]);
    });
    renderWithDraft(`${SAVED_YAML}\n`);

    await expect(confirmBreakingChange(draft)).resolves.toBe(false);
    expect(screen.queryByTestId('workflowBreakingChangeConfirmModal')).not.toBeInTheDocument();
  });

  it('cancels the save when the editor closes while the dialog is open', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({})]));
    const { unmount } = renderWithDraft(`${SAVED_YAML}\n`);

    const { confirmation } = await openConfirmation();
    unmount();

    await expect(confirmation).resolves.toBe(false);
  });

  it('cancels the save when the editor closes while its check runs', async () => {
    let finishCheck: (response: WorkflowDependentsImpactResponse) => void = () => {};
    (services.http.post as jest.Mock).mockImplementation(
      () => new Promise((resolve) => (finishCheck = resolve))
    );
    const { unmount } = renderWithDraft(`${SAVED_YAML}\n`);

    const confirmation = confirmBreakingChange(draft);
    unmount();
    finishCheck(impact([]));

    await expect(confirmation).resolves.toBe(false);
  });

  it('keeps checking the save when editing cancels the panel’s check of the same draft', async () => {
    const requests: Array<{ signal?: AbortSignal; resolve: (value: unknown) => void }> = [];
    (services.http.post as jest.Mock).mockImplementation(
      (_path: string, { signal }: { signal?: AbortSignal }) =>
        new Promise((resolve) => requests.push({ signal, resolve }))
    );
    const PanelAndSave = () => {
      useWorkflowDependents();
      return <Harness />;
    };
    draft = `${SAVED_YAML}\n`;
    store = createMockStore();
    store.dispatch(setWorkflow(workflowDto('alert-context', 'Alert context')));
    store.dispatch(setYamlString(draft));
    render(
      <TestProvider services={services} store={store} queryClient={createTestQueryClient()}>
        <PanelAndSave />
      </TestProvider>
    );
    await waitFor(() => expect(requests).toHaveLength(1));

    let confirmation: Promise<boolean> = Promise.resolve(false);
    act(() => {
      confirmation = confirmBreakingChange(draft);
    });
    act(() => {
      store.dispatch(setYamlString(`${draft}# more`));
    });
    await waitFor(() => expect(requests).toHaveLength(3));
    await act(async () => {
      requests.forEach(({ resolve }) => resolve(impact([])));
    });

    expect(requests[0].signal?.aborted).toBe(true);
    await expect(confirmation).resolves.toBe(true);
    expect(screen.queryByTestId('workflowBreakingChangeConfirmModal')).not.toBeInTheDocument();
  });
});
