/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 } from 'uuid';
import { i18n } from '@kbn/i18n';
import { WORKFLOW_YAML_ATTACHMENT_TYPE } from '@kbn/workflows/common/constants';
import { useKibana } from '../../../hooks/use_kibana';
import { setSidebarOpen } from '../../ai_integration';

interface UseCreationAgentChatParams {
  yaml: string;
  workflowId?: string;
  workflowName?: string;
}

/**
 * Lightweight Agent Builder open helper for the visual creation panel.
 * Full proposal sync remains owned by the YAML editor integration hook.
 */
export function useCreationAgentChat({
  yaml,
  workflowId,
  workflowName,
}: UseCreationAgentChatParams): {
  isAgentBuilderAvailable: boolean;
  openAgentChat: (options?: { initialMessage?: string; autoSendInitialMessage?: boolean }) => void;
} {
  const { workflowsManagement, application } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const [isChatAccessible, setIsChatAccessible] = useState(false);
  const unsavedIdRef = useRef(v4());
  const yamlRef = useRef(yaml);
  yamlRef.current = yaml;

  useEffect(() => {
    if (!agentBuilder || !hasShowPrivilege) {
      setIsChatAccessible(false);
      return;
    }
    let cancelled = false;
    void agentBuilder
      .getAgentBuilderAccess()
      .then((access) => {
        if (!cancelled) {
          setIsChatAccessible(access.hasRequiredLicense && access.hasLlmConnector);
        }
      })
      .catch(() => {
        if (!cancelled) setIsChatAccessible(false);
      });
    return () => {
      cancelled = true;
    };
  }, [agentBuilder, hasShowPrivilege]);

  const openAgentChat = useCallback(
    (options?: { initialMessage?: string; autoSendInitialMessage?: boolean }) => {
      if (!agentBuilder || !isChatAccessible) return;
      const attachmentId = workflowId ?? unsavedIdRef.current;
      agentBuilder.openChat({
        sessionTag: `workflow-editor:${attachmentId}`,
        greetingMessage: i18n.translate('workflowsManagement.agentBuilder.workflowEditorGreeting', {
          defaultMessage: 'What do you want to automate?',
        }),
        initialMessage: options?.initialMessage,
        autoSendInitialMessage: options?.autoSendInitialMessage,
        attachments: [
          {
            id: attachmentId,
            type: WORKFLOW_YAML_ATTACHMENT_TYPE,
            data: {
              yaml: yamlRef.current,
              workflowId,
              name: workflowName,
            },
          },
        ],
        onClose: () => setSidebarOpen(false),
      });
      setSidebarOpen(true);
    },
    [agentBuilder, isChatAccessible, workflowId, workflowName]
  );

  return {
    isAgentBuilderAvailable: agentBuilder != null && isChatAccessible,
    openAgentChat,
  };
}
