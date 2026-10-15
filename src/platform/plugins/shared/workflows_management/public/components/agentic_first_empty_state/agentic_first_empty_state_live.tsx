/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useCatalog, useLibraryEnabled } from '@kbn/workflows-ui';
import {
  AgenticFirstEmptyState,
  type AgenticFirstEmptyStateProps,
} from './agentic_first_empty_state';
import { ConnectLlmPanel } from './connect_llm_panel';
import { useKibana } from '../../hooks/use_kibana';

export type AgenticFirstEmptyStateLiveProps = Omit<
  AgenticFirstEmptyStateProps,
  'templates' | 'agentInput'
> & {
  onSubmitPrompt?: (prompt: string) => void;
};

/**
 * {@link AgenticFirstEmptyState} with the library catalog and Agent Builder's chat input.
 * It reports prompts through `onSubmitPrompt` and never calls `openChat`: the editor's
 * Agent Builder integration owns the chat session.
 */
export function AgenticFirstEmptyStateLive(props: AgenticFirstEmptyStateLiveProps) {
  const libraryEnabled = useLibraryEnabled();
  const { workflowsManagement, application, docLinks } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const chatAccess = useAgentChatAccess();

  const { onSubmitPrompt, ...stateProps } = props;
  const handlePromptSubmit = useCallback(
    (message: string) => {
      onSubmitPrompt?.(message);
    },
    [onSubmitPrompt]
  );

  const EmbeddableConversationInput = agentBuilder?.EmbeddableConversationInput;
  const handleConnectLlm = useCallback(() => {
    void application.navigateToApp('management', { path: '/modelManagement/model_settings' });
  }, [application]);

  // No prompt when the chat cannot run at all. Without an LLM, offer to connect one.
  const renderAgentInput = () => {
    if (chatAccess === 'unavailable' || !EmbeddableConversationInput) return undefined;
    if (chatAccess === 'noLlm') {
      return (
        <ConnectLlmPanel
          onConnect={handleConnectLlm}
          docsHref={docLinks.links.agentBuilder.models}
        />
      );
    }
    return <EmbeddableConversationInput onSubmit={handlePromptSubmit} />;
  };
  const agentInput = renderAgentInput();

  return libraryEnabled ? (
    <LiveInner {...stateProps} agentInput={agentInput} />
  ) : (
    <AgenticFirstEmptyState {...stateProps} agentInput={agentInput} />
  );
}

function LiveInner({ agentInput, ...props }: AgenticFirstEmptyStateProps) {
  const { templates } = useCatalog();
  return <AgenticFirstEmptyState {...props} templates={templates} agentInput={agentInput} />;
}

type AgentChatAccess = 'loading' | 'ready' | 'noLlm' | 'unavailable';

/**
 * Whether the landing's prompt can start an Agent Builder chat. Uses the same
 * checks as the editor's chat integration: plugin, `show` privilege, license, LLM.
 */
const useAgentChatAccess = (): AgentChatAccess => {
  const { workflowsManagement, application } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasShowPrivilege = application.capabilities.agentBuilder?.show === true;
  const canUseChat = Boolean(agentBuilder) && hasShowPrivilege;
  const [access, setAccess] = useState<AgentChatAccess>('loading');

  useEffect(() => {
    if (!agentBuilder || !canUseChat) return;
    let cancelled = false;
    agentBuilder
      .getAgentBuilderAccess()
      .then(({ hasRequiredLicense, hasLlmConnector }) => {
        if (cancelled) return;
        if (!hasRequiredLicense) setAccess('unavailable');
        else setAccess(hasLlmConnector ? 'ready' : 'noLlm');
      })
      .catch(() => {
        if (!cancelled) setAccess('unavailable');
      });
    return () => {
      cancelled = true;
    };
  }, [agentBuilder, canUseChat]);

  return canUseChat ? access : 'unavailable';
};
