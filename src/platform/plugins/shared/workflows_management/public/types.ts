/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type {
  AttachmentServiceStartContract,
  EventsServiceStartContract,
  ToolServiceStartContract,
} from '@kbn/agent-builder-browser';
import type { AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '@kbn/triggers-actions-ui-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import type { TrackedExecution } from '@kbn/workflows-ui';
import type { TelemetryServiceClient } from './common/lib/telemetry/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPublicPluginSetup {}

export interface WorkflowsPublicPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

/**
 * Lightweight interface for the Agent Builder plugin's public start contract.
 * Defined here instead of importing from the plugin directly to avoid circular
 * dependencies (workflowsManagement uses runtimePluginDependencies).
 */

interface EmbeddableConversationProps {
  sessionTag?: string;
  agentId?: string;
  initialMessage?: string;
  autoSendInitialMessage?: boolean;
  attachments?: AttachmentInput[];
  browserApiTools?: Array<{
    id: string;
    description: string;
    schema: unknown;
    handler: (params: unknown) => void | Promise<void>;
  }>;
}

export interface AgentBuilderPluginStartContract {
  openChat: (options?: EmbeddableConversationProps & { onClose?: () => void }) => {
    chatRef: { close: () => void };
  };
  tools: ToolServiceStartContract;
  attachments: AttachmentServiceStartContract;
  events: EventsServiceStartContract;
  addAttachment: (attachment: AttachmentInput) => void;
  setChatConfig: (config: EmbeddableConversationProps) => void;
  clearChatConfig: () => void;
}

export interface WorkflowsPublicPluginStart {
  /**
   * Track one or more workflow executions. The execution tracker badge in the
   * Chrome header will display their status and allow opening the detail flyout.
   */
  trackExecutions: (
    entries: Array<{
      id: string;
      workflowId?: string;
      workflowName?: string;
      inputSummary?: Array<{ label: string; value: string }>;
    }>
  ) => void;
  /**
   * Register a custom output renderer for the execution tracker flyout.
   * When an execution completes, matching renderers are used to display
   * solution-specific output (e.g. a link to a created case).
   */
  registerOutputRenderer: (
    id: string,
    renderer: (execution: TrackedExecution) => ReactNode | null
  ) => void;
}

export interface WorkflowsPublicPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  serverless?: ServerlessPluginStart;
  dataViews: DataViewsPublicPluginStart;
  kql: KqlPluginStart;
  fieldFormats: FieldFormatsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  spaces: SpacesPluginStart;
  triggersActionsUi: TriggersAndActionsUIPublicPluginStart;
  workflowsExtensions: WorkflowsExtensionsPublicPluginStart;
  licensing: LicensingPluginStart;
}

export interface WorkflowsPublicPluginStartAdditionalServices {
  storage: Storage;
  workflowsManagement: {
    telemetry: TelemetryServiceClient;
    agentBuilder?: AgentBuilderPluginStartContract;
  };
}

export type WorkflowsServices = CoreStart &
  WorkflowsPublicPluginStartDependencies &
  WorkflowsPublicPluginStartAdditionalServices;
