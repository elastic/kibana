/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
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
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  ...jest.requireActual('@kbn/kibana-react-plugin/public'),
  useUiSetting: jest.fn(),
}));
const useUiSettingMock = useUiSetting as jest.MockedFunction<typeof useUiSetting>;
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
}));
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
    useUiSettingMock.mockReturnValue(true);
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
    it('opens the sidebar exactly once when the editor becomes ready', () => {
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
          workflowId: 'wf-1',
        })
      );

      expect(agentBuilder.openChat).toHaveBeenCalledTimes(1);
      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledWith({
        entryPoint: 'workflow_editor',
        sessionType: 'edit',
        workflowId: 'wf-1',
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
          workflowId: 'wf-1',
        })
      );

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);

      act(() => {
        result.current.openAgentChat();
      });

      expect(mockTelemetry.reportWorkflowAiChatOpened).toHaveBeenCalledTimes(1);
    });

    it('does not auto-open when experimental features are disabled', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      useUiSettingMock.mockReturnValue(false);
      const editor = createMockEditor(mockModel);

      renderHook(() =>
        useAgentBuilderIntegration({
          editorRef: { current: editor },
          isEditorMounted: true,
        })
      );

      expect(agentBuilder.openChat).not.toHaveBeenCalled();
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
    it('returns true when agentBuilder is available and experimental features enabled', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      useUiSettingMock.mockReturnValue(true);
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

    it('returns false when experimental features are disabled', () => {
      const agentBuilder = createMockAgentBuilder();
      setupKibanaMock(agentBuilder);
      useUiSettingMock.mockReturnValue(false);
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
