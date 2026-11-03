/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { copyToClipboard } from '@elastic/eui';
import { renderHook } from '@testing-library/react';
import { useExecutionFlyoutActions } from './use_execution_flyout_actions';
import { createStartServicesMock } from '../../../mocks';
import { getTestProvider } from '../../../shared/mocks/test_providers';
import { createMockWorkflowExecutionDto } from '../../../shared/test_utils';

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  copyToClipboard: jest.fn(),
}));

jest.mock('../../../hooks/navigation/use_navigate_to_execution', () => ({
  useNavigateToExecution: () => ({
    href: '/app/workflows/wf-1?executionId=exec-1',
    navigate: jest.fn(),
  }),
}));

describe('useExecutionFlyoutActions', () => {
  const services = createStartServicesMock();
  const workflowExecution = createMockWorkflowExecutionDto({ id: 'exec-1', workflowId: 'wf-1' });

  const renderActions = (
    overrides: Partial<Parameters<typeof useExecutionFlyoutActions>[0]> = {}
  ) =>
    renderHook(
      () =>
        useExecutionFlyoutActions({
          executionId: 'exec-1',
          workflowExecution,
          selectedStepExecutionId: null,
          ...overrides,
        }),
      { wrapper: getTestProvider({ services }) }
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOpenFailedStepInEditor', () => {
    it('opens the workflow in the editor', () => {
      const { result } = renderActions();

      result.current.handleOpenFailedStepInEditor('step-1');

      expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
        path: '/wf-1',
      });
    });

    it('does nothing before the run is loaded', () => {
      const { result } = renderActions({ workflowExecution: undefined });

      result.current.handleOpenFailedStepInEditor('step-1');

      expect(services.application.navigateToApp).not.toHaveBeenCalled();
    });
  });

  describe('handleShare', () => {
    it('copies an absolute link to the run and confirms it', () => {
      const { result } = renderActions();

      result.current.handleShare();

      expect(copyToClipboard).toHaveBeenCalledWith(
        `${window.location.origin}/app/workflows/wf-1?executionId=exec-1`
      );
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        'Execution link copied',
        { toastLifeTimeMs: 2000 }
      );
    });

    it('adds the selected step to the link', () => {
      const { result } = renderActions({ selectedStepExecutionId: 'step 1' });

      result.current.handleShare();

      expect(copyToClipboard).toHaveBeenCalledWith(
        `${window.location.origin}/app/workflows/wf-1?executionId=exec-1&stepExecutionId=step%201`
      );
    });

    it('does nothing before the run is loaded', () => {
      const { result } = renderActions({ workflowExecution: undefined });

      result.current.handleShare();

      expect(copyToClipboard).not.toHaveBeenCalled();
    });
  });
});
