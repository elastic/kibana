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
  'liveTemplates' | 'agentInput'
>;

/**
 * {@link AgenticFirstEmptyState} with the library catalog and Agent Builder's chat input.
 * It reports prompts through `onSubmitPrompt` and never calls `openChat`: the editor's
 * Agent Builder integration owns the chat session.
 */
export function AgenticFirstEmptyStateLive(props: AgenticFirstEmptyStateLiveProps) {
  const libraryEnabled = useLibraryEnabled();
  const { workflowsManagement, application, docLinks } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const hasLlmConnector = useHasLlmConnector();

  const { onSubmitPrompt } = props;
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

  // Without an LLM the prompt would lead nowhere, so offer to connect one instead.
  const agentInput =
    hasLlmConnector === false ? (
      <ConnectLlmPanel onConnect={handleConnectLlm} docsHref={docLinks.links.agentBuilder.models} />
    ) : EmbeddableConversationInput ? (
      <EmbeddableConversationInput onSubmit={handlePromptSubmit} />
    ) : undefined;

  return libraryEnabled ? (
    <LiveInner {...props} agentInput={agentInput} />
  ) : (
    <AgenticFirstEmptyState {...props} agentInput={agentInput} />
  );
}

function LiveInner({
  agentInput,
  ...props
}: AgenticFirstEmptyStateLiveProps & { agentInput?: React.ReactNode }) {
  const { templates } = useCatalog();
  return <AgenticFirstEmptyState {...props} liveTemplates={templates} agentInput={agentInput} />;
}

/**
 * Resolves whether Agent Builder has an LLM connector. `undefined` while the
 * check runs, or when Agent Builder is unavailable.
 */
const useHasLlmConnector = (): boolean | undefined => {
  const agentBuilder = useKibana().services.workflowsManagement?.agentBuilder;
  const [hasLlmConnector, setHasLlmConnector] = useState<boolean | undefined>();

  useEffect(() => {
    if (!agentBuilder) return;
    let cancelled = false;
    agentBuilder
      .getAgentBuilderAccess()
      .then(({ hasRequiredLicense, hasLlmConnector: hasConnector }) => {
        // Without the license Agent Builder is off entirely; keep the default input.
        if (!cancelled && hasRequiredLicense) setHasLlmConnector(hasConnector);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [agentBuilder]);

  return hasLlmConnector;
};
