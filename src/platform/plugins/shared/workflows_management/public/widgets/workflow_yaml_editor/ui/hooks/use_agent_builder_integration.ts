/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Document } from 'yaml';
import type { monaco } from '@kbn/monaco';
import {
  createDeleteStepTool,
  createInsertStepTool,
  createModifyStepPropertyTool,
  createModifyStepTool,
  createReplaceYamlTool,
  ProposedChangesManager,
} from '../../../../features/ai_integration';
import { useKibana } from '../../../../hooks/use_kibana';

export const WORKFLOW_EDITOR_AGENT_ID = 'platform.workflows.editor';

interface UseAgentBuilderIntegrationParams {
  editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  yamlDocumentRef: React.MutableRefObject<Document | null>;
  /** Set to true once the editor is mounted */
  isEditorMounted?: boolean;
}

interface UseAgentBuilderIntegrationReturn {
  /** Opens the Agent Builder chat flyout with the current workflow YAML as context */
  openAgentChat: () => void;
  /** Whether the Agent Builder integration is available */
  isAgentBuilderAvailable: boolean;
  /** The proposed changes manager for accept/reject UX */
  proposedChangesManager: ProposedChangesManager | null;
}

/**
 * Hook to integrate the Workflow YAML Editor with the Agent Builder.
 * Provides browser API tools with Cursor-like accept/reject UX for proposed changes.
 */
export function useAgentBuilderIntegration({
  editorRef,
  yamlDocumentRef,
  isEditorMounted = false,
}: UseAgentBuilderIntegrationParams): UseAgentBuilderIntegrationReturn {
  const { agentBuilder, application, notifications } = useKibana().services;

  // Create the ProposedChangesManager instance
  const proposedChangesManagerRef = useRef<ProposedChangesManager | null>(null);

  // Initialize the ProposedChangesManager when editor is mounted
  useEffect(() => {
    // Wait until the editor is actually mounted
    if (!isEditorMounted) return;

    const editor = editorRef.current;
    if (!editor) return;

    // Create and initialize the manager
    const manager = new ProposedChangesManager();
    manager.initialize(editor, {
      onAccept: (change) => {
        notifications?.toasts.addSuccess({
          title: 'Change applied',
          text: change.description || 'The proposed change has been applied.',
          toastLifeTimeMs: 2000,
        });
      },
      onReject: (change) => {
        notifications?.toasts.addInfo({
          title: 'Change rejected',
          text: change.description
            ? `Rejected: ${change.description}`
            : 'The proposed change was rejected.',
          toastLifeTimeMs: 2000,
        });
      },
    });

    proposedChangesManagerRef.current = manager;

    return () => {
      manager.dispose();
      proposedChangesManagerRef.current = null;
    };
  }, [editorRef, isEditorMounted, notifications?.toasts]);

  // Check if agent builder is available and user has access
  const isAgentBuilderAvailable = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capabilities = application?.capabilities as any;
    return !!agentBuilder?.openConversationFlyout && capabilities?.agentBuilder?.show === true;
  }, [agentBuilder, application?.capabilities]);

  // Create stable context object for browser API tools
  const editorContext = useMemo(
    () => ({
      getEditor: () => editorRef.current,
      getYamlDocument: () => yamlDocumentRef.current,
      getProposedChangesManager: () => proposedChangesManagerRef.current,
    }),
    [editorRef, yamlDocumentRef]
  );

  // Create browser API tools with proposed changes support
  const browserApiTools = useMemo(
    () => [
      createInsertStepTool(editorContext),
      createModifyStepTool(editorContext),
      createModifyStepPropertyTool(editorContext),
      createDeleteStepTool(editorContext),
      createReplaceYamlTool(editorContext),
    ],
    [editorContext]
  );

  const openAgentChat = useCallback(() => {
    if (!agentBuilder?.openConversationFlyout) {
      // eslint-disable-next-line no-console
      console.warn('[useAgentBuilderIntegration] Agent Builder not available');
      return;
    }

    const currentYaml = editorRef.current?.getValue() ?? '';

    agentBuilder.openConversationFlyout({
      agentId: WORKFLOW_EDITOR_AGENT_ID,
      sessionTag: 'workflow-editor',
      attachments: [
        {
          type: 'workflow.yaml',
          data: { yaml: currentYaml },
        },
      ],
      browserApiTools,
    });
  }, [agentBuilder, browserApiTools, editorRef]);

  return {
    openAgentChat,
    isAgentBuilderAvailable,
    proposedChangesManager: proposedChangesManagerRef.current,
  };
}
