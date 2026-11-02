/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  isConversationCreatedEvent,
  isConversationIdSetEvent,
} from '@kbn/agent-builder-common/chat/events';
import type { HttpSetup } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { DiagnosisContextPackage } from './build_diagnosis_context_package';
import { buildDiagnosisHandoffOpenChatPayload } from './build_diagnosis_handoff';

const RENAME_PATH = (conversationId: string) =>
  `/internal/agent_builder/conversations/${conversationId}/_rename`;

export interface OpenFailureDiagnosisChatParams {
  agentBuilder: AgentBuilderPluginStart;
  http: HttpSetup;
  contextPackage: DiagnosisContextPackage;
  workflowName: string;
  onConversationOpened?: () => void;
}

/**
 * Open Agent Builder with diagnosis attachments and auto-submit the prompt.
 * Best-effort rename after the conversation id is assigned (openChat has no title API).
 */
export const openFailureDiagnosisChat = ({
  agentBuilder,
  http,
  contextPackage,
  workflowName,
  onConversationOpened,
}: OpenFailureDiagnosisChatParams): void => {
  const payload = buildDiagnosisHandoffOpenChatPayload({ contextPackage, workflowName });

  let renamed = false;
  const tryRename = (conversationId: string) => {
    if (renamed || !conversationId) {
      return;
    }
    renamed = true;
    void http
      .post(RENAME_PATH(conversationId), {
        body: JSON.stringify({ title: payload.conversationTitle }),
      })
      .catch(() => {
        // TODO(AB openChat title): public openChat API does not accept a title yet;
        // rename is best-effort via the internal conversations API.
      });
  };

  const subscription = agentBuilder.events.chat$.subscribe((event) => {
    if (isConversationIdSetEvent(event)) {
      tryRename(event.data.conversation_id);
      subscription.unsubscribe();
      return;
    }
    if (isConversationCreatedEvent(event)) {
      tryRename(event.data.conversation_id);
      subscription.unsubscribe();
    }
  });

  // TODO(AB attachment API): prefer a dedicated workflow-failure attachment type
  // once registered on the AB allow-list; text/group attachments carry the package until then.
  agentBuilder.openChat({
    newConversation: true,
    sessionTag: payload.sessionTag,
    attachments: payload.attachments,
    initialMessage: payload.initialMessage,
    autoSendInitialMessage: true,
  });

  onConversationOpened?.();
};

export const diagnoseHandoffErrorToastTitle = () =>
  i18n.translate('workflows.executionFlyout.failedStep.diagnoseHandoffErrorTitle', {
    defaultMessage: 'Unable to start AI diagnosis',
  });
