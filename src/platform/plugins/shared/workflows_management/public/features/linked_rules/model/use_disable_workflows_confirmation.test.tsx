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
import type { ConfirmDisableWorkflows } from './use_disable_workflows_confirmation';
import { useDisableWorkflowsConfirmation } from './use_disable_workflows_confirmation';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

describe('useDisableWorkflowsConfirmation', () => {
  let confirmDisable: ConfirmDisableWorkflows;
  let services: ReturnType<typeof createStartServicesMock>;

  const Harness = () => {
    const hook = useDisableWorkflowsConfirmation();
    confirmDisable = hook.confirmDisable;
    return hook.confirmModal;
  };

  const openConfirmation = async (): Promise<{ confirmation: Promise<boolean> }> => {
    let confirmation: Promise<boolean> = Promise.resolve(false);
    act(() => {
      confirmation = confirmDisable(['wf-1']);
    });
    await screen.findByTestId('workflowsDisableConfirmationModal');
    return { confirmation };
  };

  beforeEach(() => {
    services = createStartServicesMock();
    (services.application.getUrlForApp as jest.Mock).mockImplementation(
      (appId: string, { path }: { path: string }) => `/app/${appId}/${path.replace(/^\//, '')}`
    );
    render(
      <TestProvider services={services}>
        <Harness />
      </TestProvider>
    );
  });

  it('resolves to true without a prompt when no rule runs the workflows', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({ total: 0, rules: [] });

    await expect(confirmDisable(['wf-1'])).resolves.toBe(true);

    expect(services.http.post).toHaveBeenCalledWith('/internal/workflows/_linked_rules', {
      body: JSON.stringify({ ids: ['wf-1'] }),
      version: '1',
    });
    expect(screen.queryByTestId('workflowsDisableConfirmationModal')).not.toBeInTheDocument();
  });

  it('lists the linked rules with links and resolves to true on confirm', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({
      total: 12,
      rules: [
        { id: 'rule-1', name: 'Detection rule', ruleTypeId: 'siem.queryRule' },
        { id: 'rule-2', name: 'Stack rule', ruleTypeId: '.es-query' },
      ],
    });

    const { confirmation } = await openConfirmation();

    expect(screen.getByText('Detection rule').closest('a')).toHaveAttribute(
      'href',
      '/app/securitySolutionUI/rules/id/rule-1'
    );
    expect(screen.getByText('Stack rule').closest('a')).toHaveAttribute(
      'href',
      '/app/management/insightsAndAlerting/triggersActions/rule/rule-2'
    );
    expect(screen.getByText('And 10 more.')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await expect(confirmation).resolves.toBe(true);
    expect(screen.queryByTestId('workflowsDisableConfirmationModal')).not.toBeInTheDocument();
  });

  it('resolves to false when the user cancels', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({
      total: 1,
      rules: [{ id: 'rule-1', name: 'Detection rule', ruleTypeId: 'siem.queryRule' }],
    });

    const { confirmation } = await openConfirmation();
    await userEvent.click(screen.getByTestId('confirmModalCancelButton'));

    await expect(confirmation).resolves.toBe(false);
  });

  it('resolves a previous confirmation to false when a new one starts', async () => {
    (services.http.post as jest.Mock).mockResolvedValue({
      total: 1,
      rules: [{ id: 'rule-1', name: 'Detection rule', ruleTypeId: 'siem.queryRule' }],
    });

    const { confirmation: first } = await openConfirmation();
    const { confirmation: second } = await openConfirmation();

    await expect(first).resolves.toBe(false);
    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    await expect(second).resolves.toBe(true);
  });

  it('warns that linked rules could not be checked when the lookup fails', async () => {
    (services.http.post as jest.Mock).mockRejectedValue(new Error('boom'));

    await openConfirmation();

    expect(screen.getByTestId('workflowLinkedRulesError')).toBeInTheDocument();
  });
});
