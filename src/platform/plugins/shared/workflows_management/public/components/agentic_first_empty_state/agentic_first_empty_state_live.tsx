/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { Template } from '@kbn/workflows-library';
import { useCatalog, useLibraryEnabled } from '@kbn/workflows-ui';
import {
  AgenticFirstEmptyState,
  type AgenticFirstEmptyStateProps,
} from './agentic_first_empty_state';
import { AgenticFirstPromptInput } from './agentic_first_prompt_input';
import { useKibana } from '../../hooks/use_kibana';

export type AgenticFirstEmptyStateLiveProps = Omit<
  AgenticFirstEmptyStateProps,
  'liveTemplates' | 'agentInput'
>;

const GREETING_MESSAGE = i18n.translate('workflows.agenticFirst.greeting', {
  defaultMessage: 'What do you want to automate?',
});

/**
 * Wraps {@link AgenticFirstEmptyState} with real Kibana data:
 *  - Template library catalog behind the `useLibraryEnabled` feature flag.
 *  - A prompt input that opens the Agent Builder sidebar (via
 *    `agentBuilder.openChat`) rather than navigating to the Agent Builder app.
 *    Keeps the user on `/workflows/create` while the agent starts responding.
 */
export function AgenticFirstEmptyStateLive(props: AgenticFirstEmptyStateLiveProps) {
  const libraryEnabled = useLibraryEnabled();
  const { workflowsManagement } = useKibana().services;
  const agentBuilder = workflowsManagement?.agentBuilder;

  const handlePromptSubmit = useCallback(
    (message: string) => {
      if (!agentBuilder) return;
      agentBuilder.openChat({
        initialMessage: message,
        autoSendInitialMessage: true,
        greetingMessage: GREETING_MESSAGE,
      });
      props.onSubmitPrompt?.(message);
    },
    [agentBuilder, props]
  );

  const agentInput = agentBuilder ? (
    <AgenticFirstPromptInput onSubmit={handlePromptSubmit} />
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
  return (
    <AgenticFirstEmptyState
      {...props}
      liveTemplates={templates as Template[]}
      agentInput={agentInput}
    />
  );
}
