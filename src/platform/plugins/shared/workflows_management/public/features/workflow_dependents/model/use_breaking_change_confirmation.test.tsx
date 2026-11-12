/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { useBreakingChangeConfirmation } from './use_breaking_change_confirmation';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import type { DependentImpact } from '../../../../common/lib/workflow_dependents/types';
import { createMockStore } from '../../../entities/workflows/store/__mocks__/store.mock';
import {
  setWorkflow,
  setYamlString,
} from '../../../entities/workflows/store/workflow_detail/slice';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

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
    summary: { direct: dependents.length, breaking: 0, warning: 0, indirectBreaking },
  },
  calledWorkflows: [],
});

describe('useBreakingChangeConfirmation', () => {
  let confirmBreakingChange: () => Promise<boolean>;
  let services: ReturnType<typeof createStartServicesMock>;
  const onReviewImpact = jest.fn();

  const Harness = () => {
    const hook = useBreakingChangeConfirmation(onReviewImpact);
    confirmBreakingChange = hook.confirmBreakingChange;
    return hook.confirmModal;
  };

  const renderWithDraft = (draftYaml: string) => {
    const store = createMockStore();
    store.dispatch(
      setWorkflow({
        id: 'alert-context',
        name: 'Alert context',
        enabled: true,
        yaml: SAVED_YAML,
        lastUpdatedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'test-user',
        lastUpdatedBy: 'test-user',
        definition: null,
        valid: true,
      })
    );
    store.dispatch(setYamlString(draftYaml));
    render(
      <TestProvider services={services} store={store}>
        <Harness />
      </TestProvider>
    );
  };

  const openConfirmation = async (): Promise<{ confirmation: Promise<boolean> }> => {
    let confirmation: Promise<boolean> = Promise.resolve(false);
    act(() => {
      confirmation = confirmBreakingChange();
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

    await expect(confirmBreakingChange()).resolves.toBe(true);

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('saves without a prompt when only turned-off callers break', async () => {
    (services.http.post as jest.Mock).mockResolvedValue(impact([caller({ enabled: false })]));
    renderWithDraft(`${SAVED_YAML}\n`);

    await expect(confirmBreakingChange()).resolves.toBe(true);

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
      screen.getByText(': Doesn’t send the input "tenant", which Alert context requires', {
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

  it('saves without a prompt when the analysis fails', async () => {
    (services.http.post as jest.Mock).mockRejectedValue(new Error('boom'));
    renderWithDraft(`${SAVED_YAML}\n`);

    await expect(confirmBreakingChange()).resolves.toBe(true);
  });
});
