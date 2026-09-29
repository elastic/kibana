/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { act, renderHook } from '@testing-library/react';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import {
  clearPendingDiagnoseHandoff,
  loadPendingDiagnoseHandoff,
} from './diagnose_pending_handoff';
import { useErrorPanelDiagnoseAvailability } from './use_error_panel_diagnose_availability';

const mockOpenFailureDiagnosisChat = vi.fn();
const mockAddError = vi.fn();
const mockHttpGet = vi.fn();
const mockGetAgentBuilderAccess = vi.fn();

const mockAgentBuilder = {
  openChat: vi.fn(),
  getAgentBuilderAccess: mockGetAgentBuilderAccess,
  events: { chat$: { subscribe: () => ({ unsubscribe: () => undefined }) } },
};

vi.mock('./open_failure_diagnosis_chat', () => {
      const mocked = {
      openFailureDiagnosisChat: (...args: unknown[]) => mockOpenFailureDiagnosisChat(...args),
      diagnoseHandoffErrorToastTitle: () => 'Unable to start AI diagnosis',
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useUiSetting: () => true,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../hooks/use_kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          http: { get: mockHttpGet, post: vi.fn() },
          notifications: { toasts: { addError: mockAddError } },
          application: {
            capabilities: { agentBuilder: { show: true } },
            navigateToApp: vi.fn(),
            getUrlForApp: () => '/app/management/license_management',
          },
          workflowsManagement: {
            agentBuilder: mockAgentBuilder,
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

const contextPackage: DiagnosisContextPackage = {
  error: { type: 'Error', message: 'ECONNREFUSED' },
  stepInput: { method: 'GET' },
  stepYaml: { name: 'triage_overview', type: 'http' },
  workflowId: 'wf-1',
  executionId: 'run-1',
  stepId: 'triage_overview',
};

describe('useErrorPanelDiagnoseAvailability handoff', () => {
  beforeEach(() => {
    mockOpenFailureDiagnosisChat.mockReset();
    mockAddError.mockReset();
    mockHttpGet.mockReset();
    mockGetAgentBuilderAccess.mockReset();
    clearPendingDiagnoseHandoff();
    mockHttpGet.mockResolvedValue({ connectors: [{ id: 'c1' }] });
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
  });

  afterEach(() => {
    clearPendingDiagnoseHandoff();
  });

  it('opens one handoff with the context package (state A)', async () => {
    const { result } = renderHook(() => useErrorPanelDiagnoseAvailability());

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.openDiagnose({
        contextPackage,
        workflowName: 'Flyout Demo — AI + Flow Control',
      });
    });

    expect(mockOpenFailureDiagnosisChat).toHaveBeenCalledTimes(1);
    expect(mockOpenFailureDiagnosisChat.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        contextPackage,
        workflowName: 'Flyout Demo — AI + Flow Control',
      })
    );
  });

  it('double-click creates exactly one handoff', async () => {
    const { result } = renderHook(() => useErrorPanelDiagnoseAvailability());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.openDiagnose({ contextPackage, workflowName: 'Demo' });
      result.current.openDiagnose({ contextPackage, workflowName: 'Demo' });
    });

    expect(mockOpenFailureDiagnosisChat).toHaveBeenCalledTimes(1);
  });

  it('toasts when the handoff throws', async () => {
    mockOpenFailureDiagnosisChat.mockImplementation(() => {
      throw new Error('AB down');
    });

    const { result } = renderHook(() => useErrorPanelDiagnoseAvailability());
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      result.current.openDiagnose({ contextPackage, workflowName: 'Demo' });
    });

    expect(mockAddError).toHaveBeenCalled();
    expect(loadPendingDiagnoseHandoff()).toBeNull();
  });

  it('state B: stores pending context and resumes handoff after connectors appear', async () => {
    mockHttpGet.mockResolvedValue({ connectors: [] });
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: false,
    });

    const { result } = renderHook(() => useErrorPanelDiagnoseAvailability());
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.rawState).toBe('b');

    act(() => {
      result.current.openDiagnose({ contextPackage, workflowName: 'Demo' });
    });

    expect(mockOpenFailureDiagnosisChat).toHaveBeenCalledTimes(1);
    expect(loadPendingDiagnoseHandoff()?.workflowName).toBe('Demo');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450));
    });

    mockHttpGet.mockResolvedValue({ connectors: [{ id: 'c1' }] });
    mockGetAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
    mockOpenFailureDiagnosisChat.mockClear();

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockOpenFailureDiagnosisChat).toHaveBeenCalledTimes(1);
    expect(loadPendingDiagnoseHandoff()).toBeNull();
  });
});
