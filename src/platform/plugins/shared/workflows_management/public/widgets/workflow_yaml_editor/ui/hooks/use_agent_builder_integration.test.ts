/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { useAgentBuilderIntegration } from './use_agent_builder_integration';
import { useKibana } from '../../../../hooks/use_kibana';

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));
jest.mock('../../../../hooks/use_kibana');
const mockTelemetry = {
  reportWorkflowAiChatOpened: jest.fn(),
  reportWorkflowAiSessionCompleted: jest.fn(),
  reportAiProposalReceived: jest.fn(),
  reportAiProposalResolved: jest.fn(),
};
jest.mock('../../../../hooks/use_telemetry', () => ({
  useTelemetry: () => mockTelemetry,
}));
jest.mock('uuid', () => ({ v4: () => 'mock-uuid-1234' }));
jest.mock('../../../../features/ai_integration', () => ({
  AttachmentBridge: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  ProposalManager: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    dispose: jest.fn(),
    getDiffHunks: jest.fn().mockReturnValue([]),
    hasPendingProposals: jest.fn().mockReturnValue(false),
  })),
  setActiveProposalManager: jest.fn(),
  setLastCreateAttachmentId: jest.fn(),
  setSidebarOpen: jest.fn(),
  consumeSidebarRestoreFor: jest.fn().mockReturnValue(false),
}));

type AiIntegrationModule = typeof import('../../../../features/ai_integration');
const {
  setLastCreateAttachmentId: mockSetLastCreateAttachmentId,
  setSidebarOpen: mockSetSidebarOpen,
  consumeSidebarRestoreFor: mockConsumeSidebarRestoreFor,
} = jest.requireMock('../../../../features/ai_integration') as {
  setLastCreateAttachmentId: jest.MockedFunction<AiIntegrationModule['setLastCreateAttachmentId']>;
  setSidebarOpen: jest.MockedFunction<AiIntegrationModule['setSidebarOpen']>;
  consumeSidebarRestoreFor: jest.MockedFunction<AiIntegrationModule['consumeSidebarRestoreFor']>;
};
jest.mock('../../../../features/ai_integration/proposal_tracker', () => ({
  ProposalTracker: jest.fn().mockImplementation(() => ({
    onAllResolved: jest.fn().mockReturnValue(jest.fn()),
    updateStatus: jest.fn(),
    cascadeDecline: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
    getAllRecords: jest.fn().mockReturnValue([]),
  })),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

type ContentChangeCallback = () => void;

const createMockModel = (value = 'name: test-workflow') => {
  let contentChangeCallback: ContentChangeCallback | null = null;
  return {
    getValue: jest.fn().mockReturnValue(value),
    onDidChangeContent: jest.fn((cb: ContentChangeCallback) => {
      contentChangeCallback = cb;
      return { dispose: jest.fn() };
    }),
    simulateContentChange: (newValue?: string) => {
      if (newValue) {
        (mockModel.getValue as jest.Mock).mockReturnValue(newValue);
      }
      contentChangeCallback?.();
    },
  };
};

let mockModel: ReturnType<typeof createMockModel>;

const createMockEditor = (model: ReturnType<typeof createMockModel>) =>
  ({ getModel: jest.fn().mockReturnValue(model) } as any);

const createMockAgentBuilder = () => ({
  addAttachment: jest.fn(),
  setChatConfig: jest.fn(),
  clearChatConfig: jest.fn(),
  openChat: jest.fn().mockReturnValue({ chatRef: { close: jest.fn() } }),
  events: { chat$: { subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }) } },
  tools: {},
  attachments: {},
});

const setupKibanaMock = (agentBuilder?: ReturnType<typeof createMockAgentBuilder>) => {
  useKibanaMock.mockReturnValue({
    services: {
      workflowsManagement: {
        agentBuilder,
      },
    },
  } as any);
};

const INITIAL_YAML = 'name: test-workflow';

const MOCK_UUID = 'mock-uuid-1234';

const expectedAttachment = (yaml: string, overrides?: { workflowId?: string; name?: string }) => ({
  id: overrides?.workflowId ?? MOCK_UUID,
  type: WORKFLOW_YAML_ATTACHMENT_TYPE,
  data: {
    yaml,
    workflowId: overrides?.workflowId,
    name: overrides?.name,
    clientDiagnostics: undefined,
  },
});

const WORKFLOW_EDITOR_GREETING = 'What do you want to automate?';

const expectedChatConfig = (
  attachment: ReturnType<typeof expectedAttachment>,
  attachmentId: string = MOCK_UUID
) => ({
  sessionTag: `workflow-editor:${attachmentId}`,
  greetingMessage: WORKFLOW_EDITOR_GREETING,
  attachments: [attachment],
});

describe('useAgentBuilderIntegration', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockModel = createMockModel(INITIAL_YAML);
    mockConsumeSidebarRestoreFor.mockReturnValue(false);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('attachment sync on mount', () => {
    it('calls setChatConfig and addAttachment immediately when editor is mounted', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      const expected = expectedAttachment(INITIAL_YAML);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(expectedChatConfig(expected));
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expected);
    });

    it('propagates the workflow-editor greetingMessage in the chat config', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expect.objectContaining({ greetingMessage: WORKFLOW_EDITOR_GREETING })
      );
    });

    it('does not sync when editor is not mounted', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: false,
        })
      );

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('does not sync when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      expect(() =>
        renderHook(() =>
          useAgentBuilderIntegration({
            editorRef: { current: editor },
            isEditorMounted: true,
          })
        )
      ).not.toThrow();
    });

    it('does not sync when editor ref is null', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: null },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
      expect(agentBuilder.addAttachment).not.toHaveBeenCalled();
    });

    it('includes workflowId and workflowName in the attachment', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-123',
          workflowName: 'My Workflow',
        })
      );

      const expected = expectedAttachment(INITIAL_YAML, {
        workflowId: 'wf-123',
        name: 'My Workflow',
      });
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expected, 'wf-123')
      );
    });

    it('does not tear down the effect when workflowName changes', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const editorRef = { current: editor } as any;

      const { rerender } = renderHook((props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef,
          isEditorMounted: true,
          workflowName: 'Original Name',
        },
      });

      agentBuilder.clearChatConfig.mockClear();
      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      rerender({
        editorRef,
        isEditorMounted: true,
        workflowName: 'Updated Name',
      });

      expect(agentBuilder.clearChatConfig).not.toHaveBeenCalled();

      mockModel.simulateContentChange('name: changed');
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expectedAttachment('name: changed', { name: 'Updated Name' }))
      );
    });

    it('uses a generated UUID as attachment id when workflowId is undefined', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTag: `workflow-editor:${MOCK_UUID}`,
          attachments: [expect.objectContaining({ id: MOCK_UUID })],
        })
      );
    });
  });

  describe('attachment sync on content change', () => {
    it('syncs attachment after debounce when content changes', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      const updatedYaml = 'name: updated-workflow';
      mockModel.simulateContentChange(updatedYaml);

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const expected = expectedAttachment(updatedYaml);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(expectedChatConfig(expected));
      expect(agentBuilder.addAttachment).toHaveBeenCalledWith(expected);
    });

    it('debounces rapid content changes', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      mockModel.simulateContentChange('change-1');
      act(() => {
        jest.advanceTimersByTime(200);
      });

      mockModel.simulateContentChange('change-2');
      act(() => {
        jest.advanceTimersByTime(200);
      });

      mockModel.simulateContentChange('change-3');

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).toHaveBeenCalledTimes(1);
      expect(agentBuilder.setChatConfig).toHaveBeenCalledWith(
        expectedChatConfig(expectedAttachment('change-3'))
      );
    });
  });

  describe('cleanup on unmount', () => {
    it('calls clearChatConfig on unmount', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      unmount();

      expect(agentBuilder.clearChatConfig).toHaveBeenCalled();
    });

    it('does not fire pending debounced sync after unmount', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      agentBuilder.setChatConfig.mockClear();
      agentBuilder.addAttachment.mockClear();

      mockModel.simulateContentChange('pending-change');
      unmount();

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(agentBuilder.setChatConfig).not.toHaveBeenCalled();
    });
  });

  describe('auto-open on editor mount', () => {
    it('opens the sidebar exactly once on the create route (no workflowId)', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { rerender } = renderHook(
        (props: {
          editorRef: React.MutableRefObject<any>;
          isEditorMounted: boolean;
          workflowName?: string;
        }) => useAgentBuilderIntegration(props),
        {
          initialProps: {
            editorRef: { current: editor },
            isEditorMounted: true,
            workflowName: 'Original Name',
          },
        }
      );

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({ greetingMessage: WORKFLOW_EDITOR_GREETING })
      );

      // Re-render with prop changes must not re-fire the auto-open.
      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowName: 'Updated Name',
      });
      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
    });

    it('does NOT auto-open on an existing workflow detail view', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-1',
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
      expect(mockTelemetry.reportWorkflowAiChatOpened).not.toHaveBeenCalled();
    });

    it('restores the sidebar on mount when the save thunk requested it', () => {
      // Simulates create → save → detail: save thunk called
      // requestSidebarRestore(workflowId) before navigateToApp, and the
      // remount consumes it here.
      mockConsumeSidebarRestoreFor.mockImplementation((id: string) => id === 'wf-just-saved');
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-just-saved',
        })
      );

      expect(mockConsumeSidebarRestoreFor).toHaveBeenCalledWith('wf-just-saved');
      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
    });

    it('does NOT restore when the pending id belongs to a different workflow', () => {
      mockConsumeSidebarRestoreFor.mockImplementation((id: string) => id === 'wf-A');
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-B',
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
    });

    it('does not auto-open when the editor is not yet mounted', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: false,
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
    });

    it('tags chat-opened and session-completed telemetry with autoOpened=true on auto-open', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledWith({
        entryPoint: 'workflow_editor',
        sessionType: 'create',
        workflowId: undefined,
        autoOpened: true,
      });

      unmount();
      expect(mockTelemetry.reportWorkflowAiSessionCompleted).toHaveBeenCalledWith(
        expect.objectContaining({ autoOpened: true })
      );
    });

    it('does not re-emit chat-opened when the user opens the chat after an auto-open', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.openAgentChat();
      });

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanup closes the chat sidebar', () => {
    it('closes the chat sidebar on unmount (leaves the workflow app)', () => {
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      // Auto-open path opened the chat; unmount must close it.
      unmount();

      expect(chatRef.close).toHaveBeenCalled();
    });

    it('does NOT close the sidebar when workflowId flips (create → saved detail)', () => {
      // Repro of the bug the initial fix caused: after Save the sidebar was
      // closing because the effect cleanup ran on workflowId change and
      // called chatRef.close(). The close is now scoped to true unmount.
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      interface Props {
        editorRef: React.MutableRefObject<any>;
        isEditorMounted: boolean;
        workflowId?: string;
      }
      const { rerender } = renderHook((props: Props) => useAgentBuilderIntegration(props), {
        initialProps: {
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: undefined,
        } as Props,
      });

      // Flip from create (no id) to saved detail (real id). The main effect
      // cleanup+rerun fires; the sidebar close must NOT.
      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowId: 'wf-just-saved',
      });

      expect(chatRef.close).not.toHaveBeenCalled();
    });

    it('does NOT close the sidebar when workflowName changes (unrelated dep churn)', () => {
      const agentBuilder = createMockAgentBuilder();
      const chatRef = { close: jest.fn() };
      agentBuilder.openChat.mockReturnValue({ chatRef });
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { rerender } = renderHook(
        (props: {
          editorRef: React.MutableRefObject<any>;
          isEditorMounted: boolean;
          workflowName?: string;
        }) => useAgentBuilderIntegration(props),
        {
          initialProps: {
            editorRef: { current: editor },
            isEditorMounted: true,
            workflowName: 'Old Name',
          },
        }
      );

      rerender({
        editorRef: { current: editor },
        isEditorMounted: true,
        workflowName: 'New Name',
      });

      expect(chatRef.close).not.toHaveBeenCalled();
    });
  });

  describe('sidebar-open state tracking', () => {
    it('marks the sidebar open when openChat runs and closed via the onClose callback', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      // Auto-open ran → sidebar marked open.
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);

      // Simulate the user closing the sidebar from its own chrome — the
      // agent-builder plugin invokes the onClose callback we passed.
      const openChatArgs = agentBuilder.openChat.mock.calls[0][0];
      openChatArgs.onClose();
      expect(mockSetSidebarOpen).toHaveBeenLastCalledWith(false);
    });

    it('marks the sidebar closed on unmount', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { unmount } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      mockSetSidebarOpen.mockClear();
      unmount();
      expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('conversation handoff registration', () => {
    it('registers the unsaved attachment id when there is no workflowId', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(mockSetLastCreateAttachmentId).toHaveBeenCalledWith(MOCK_UUID);
    });

    it('does NOT register or clear the create-attachment when a workflowId is present', () => {
      // The module-level value is single-shot — consumed by
      // carryConversationToWorkflow in the save thunk. Clearing here would
      // race the thunk's carry call after `dispatch(setWorkflow(...))`, since
      // the resulting re-render re-fires this effect with workflowId set.
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-abc',
        })
      );

      expect(mockSetLastCreateAttachmentId).not.toHaveBeenCalled();
    });
  });

  describe('openAgentChat', () => {
    it('calls openChat with workflow attachment and session tag', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          workflowId: 'wf-456',
          workflowName: 'Test Flow',
        })
      );

      act(() => {
        result.current.openAgentChat();
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith({
        sessionTag: 'workflow-editor:wf-456',
        greetingMessage: WORKFLOW_EDITOR_GREETING,
        initialMessage: undefined,
        autoSendInitialMessage: undefined,
        attachments: [
          expectedAttachment(INITIAL_YAML, { workflowId: 'wf-456', name: 'Test Flow' }),
        ],
        onClose: expect.any(Function),
      });
    });

    it('passes initialMessage and autoSendInitialMessage options', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      act(() => {
        result.current.openAgentChat({
          initialMessage: 'Fix this workflow',
          autoSendInitialMessage: true,
        });
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          initialMessage: 'Fix this workflow',
          autoSendInitialMessage: true,
        })
      );
    });

    it('does not call openChat when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      act(() => {
        result.current.openAgentChat();
      });

      // No error thrown
    });

    it('includes validation errors as clientDiagnostics', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const validationErrors = [
        {
          id: 'err-1',
          severity: 'error' as const,
          message: 'Invalid step',
          owner: 'yaml' as const,
          hoverMessage: null,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 10,
        },
        {
          id: 'err-2',
          severity: 'warning' as const,
          message: 'Missing field',
          owner: 'variable-validation' as const,
          hoverMessage: null,
          startLineNumber: 2,
          startColumn: 1,
          endLineNumber: 2,
          endColumn: 15,
        },
      ];

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
          validationErrors,
        })
      );

      act(() => {
        result.current.openAgentChat();
      });

      expect(agentBuilder.openChat).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments: [
            expect.objectContaining({
              data: expect.objectContaining({
                clientDiagnostics: [
                  { severity: 'error', message: 'Invalid step', source: 'yaml' },
                  { severity: 'warning', message: 'Missing field', source: 'variable-validation' },
                ],
              }),
            }),
          ],
        })
      );
    });
  });

  describe('isAgentBuilderAvailable', () => {
    it('returns true when agentBuilder is available', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(result.current.isAgentBuilderAvailable).toBe(true);
    });

    it('returns false when agentBuilder is not available', () => {
      setupKibanaMock(undefined);
      const editor = createMockEditor(mockModel);

      const { result } = renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(result.current.isAgentBuilderAvailable).toBe(false);
    });
  });
});
