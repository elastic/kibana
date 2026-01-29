/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
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

/**
 * AgentBuilder plugin start contract interface.
 * Defined here to avoid circular dependency with @kbn/agent-builder-plugin.
 */
export interface AgentBuilderPluginStartContract {
  openConversationFlyout: (options?: {
    agentId?: string;
    sessionTag?: string;
    attachments?: Array<{ type: string; data: unknown }>;
    browserApiTools?: Array<{
      id: string;
      description: string;
      schema: unknown;
      handler: (params: unknown) => void | Promise<void>;
    }>;
  }) => { flyoutRef: { close(): void } };
}

export interface WorkflowsPublicPluginSetup {
  /**
   * Register the Agent Builder service with Workflows Management.
   * This is called by the agentBuilder plugin during its start phase to provide
   * the flyout service to workflowsManagement without creating a circular dependency.
   */
  registerAgentBuilder: (agentBuilder: AgentBuilderPluginStartContract) => void;
}

export interface WorkflowsPublicPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

export interface WorkflowsPublicPluginStart {
  /**
   * Get the registered Agent Builder service, if available.
   */
  getAgentBuilder: () => AgentBuilderPluginStartContract | undefined;
}

export interface WorkflowsPublicPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  serverless?: ServerlessPluginStart;
  dataViews: DataViewsPublicPluginStart;
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
  /** Agent Builder service - registered dynamically by the agentBuilder plugin */
  agentBuilder?: AgentBuilderPluginStartContract;
}

export type WorkflowsServices = CoreStart &
  WorkflowsPublicPluginStartDependencies &
  WorkflowsPublicPluginStartAdditionalServices;
