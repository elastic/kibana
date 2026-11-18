/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { ConversationAttachment } from '@kbn/agent-builder-common/attachments';
import { i18n } from '@kbn/i18n';
import {
  useActiveSolution,
  useCatalog,
  useLibraryEnabled,
  useWorkflowsCapabilities,
} from '@kbn/workflows-ui';
import {
  AgenticFirstEmptyState,
  type AgenticFirstEmptyStateProps,
} from './agentic_first_empty_state';
import { categoryLibrarySearch, selectCategoryTiles, summarizeCategoryTile } from './category_tiles';
import { ConnectLlmPanel } from './connect_llm_panel';
import { PLUGIN_ID } from '../../../common';
import { WorkflowsPageName } from '../../deep_links';
import { useKibana } from '../../hooks/use_kibana';
import {
  EMPTY_WORKFLOW_AUTO_MIGRATION,
  EMPTY_WORKFLOW_LLM_DISABLED,
  EMPTY_WORKFLOW_LLM_ENABLED,
  MANAGED_OFF_NO_CUSTOM,
  useWorkflowPrototypeScenario,
} from '../../shared/workflow_prototype_scenario';

export type AgenticFirstEmptyStateLiveProps = Omit<
  AgenticFirstEmptyStateProps,
  'categoryTiles' | 'agentInput'
> & {
  onSubmitPrompt?: (prompt: string, attachments: ConversationAttachment[]) => void;
};

/**
 * {@link AgenticFirstEmptyState} with the library catalog and Agent Builder's chat input.
 * It reports prompts through `onSubmitPrompt` and never calls `openChat`: the editor's
 * Agent Builder integration owns the chat session.
 */
export function AgenticFirstEmptyStateLive(props: AgenticFirstEmptyStateLiveProps) {
  const libraryEnabled = useLibraryEnabled();
  const { workflowsManagement, application, docLinks } = useKibana().services;
  const { canCreateWorkflow } = useWorkflowsCapabilities();
  const scenario = useWorkflowPrototypeScenario();
  const showAutoMigration = scenario === EMPTY_WORKFLOW_AUTO_MIGRATION;
  const agentBuilder = workflowsManagement?.agentBuilder;
  const chatAccess = useAgentChatAccess();

  const { onSubmitPrompt, ...stateProps } = props;
  const handlePromptSubmit = useCallback(
    (message: string, attachments: ConversationAttachment[]) => {
      onSubmitPrompt?.(message, attachments);
    },
    [onSubmitPrompt]
  );

  const EmbeddableConversationInput = agentBuilder?.EmbeddableConversationInput;
  const handleConnectLlm = useCallback(() => {
    void application.navigateToApp('management', { path: '/modelManagement/model_settings' });
  }, [application]);

  // No prompt when the chat cannot run at all. Without an LLM, offer to connect one.
  const renderAgentInput = () => {
    if (chatAccess === 'noLlm') {
      return (
        <ConnectLlmPanel
          onConnect={handleConnectLlm}
          docsHref={docLinks.links.agentBuilder.models}
        />
      );
    }
    if (chatAccess === 'unavailable' || !EmbeddableConversationInput) return undefined;
    return (
      <EmbeddableConversationInput
        onSubmit={handlePromptSubmit}
        placeholder={workflowPromptPlaceholder}
      />
    );
  };
  const agentInput = renderAgentInput();

  return libraryEnabled ? (
    <LiveInner
      {...stateProps}
      agentInput={agentInput}
      canCreateWorkflow={canCreateWorkflow}
      showAutoMigration={showAutoMigration}
    />
  ) : (
    <AgenticFirstEmptyState
      {...stateProps}
      agentInput={agentInput}
      canCreateWorkflow={canCreateWorkflow}
      showAutoMigration={showAutoMigration}
      showExampleWorkflowsLink
    />
  );
}

function LiveInner({ agentInput, ...props }: AgenticFirstEmptyStateProps) {
  const { templates } = useCatalog();
  const activeSolution = useActiveSolution();
  const { application } = useKibana().services;
  const categoryTiles = useMemo(
    () =>
      selectCategoryTiles(templates, activeSolution).map((tile) => ({
        category: tile.category,
        title: tile.title(),
        description: tile.description(),
        iconType: tile.iconType,
        href: application.getUrlForApp(PLUGIN_ID, {
          deepLinkId: WorkflowsPageName.library,
          path: categoryLibrarySearch(tile, activeSolution),
        }),
        ...summarizeCategoryTile(templates, tile),
      })),
    [activeSolution, application, templates]
  );
  return (
    <AgenticFirstEmptyState {...props} categoryTiles={categoryTiles} agentInput={agentInput} />
  );
}

const workflowPromptPlaceholder = i18n.translate('workflows.agenticFirst.promptPlaceholder', {
  defaultMessage:
    'Describe the workflow you want to create: what should trigger it and what happens next',
});

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
  const scenario = useWorkflowPrototypeScenario();
  const [access, setAccess] = useState<AgentChatAccess>('loading');

  useEffect(() => {
    if (
      scenario === EMPTY_WORKFLOW_LLM_DISABLED ||
      scenario === EMPTY_WORKFLOW_LLM_ENABLED ||
      scenario === EMPTY_WORKFLOW_AUTO_MIGRATION ||
      scenario === MANAGED_OFF_NO_CUSTOM
    ) {
      return;
    }
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
  }, [agentBuilder, canUseChat, scenario]);

  if (scenario === EMPTY_WORKFLOW_LLM_DISABLED) return 'noLlm';
  if (
    scenario === EMPTY_WORKFLOW_LLM_ENABLED ||
    scenario === EMPTY_WORKFLOW_AUTO_MIGRATION ||
    scenario === MANAGED_OFF_NO_CUSTOM
  ) {
    return 'ready';
  }
  return canUseChat ? access : 'unavailable';
};
