/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { Storage } from '@kbn/kibana-utils-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginSetup {
  // runWorkflow ?
}

export interface WorkflowsPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginStart {}

export interface WorkflowsPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

export interface WorkflowsPluginStartAdditionalServices {
  storage: Storage;
}

export interface WorkflowsSearchParams {
  limit: number;
  page: number;
  query?: string;
  createdBy?: string[];
  enabled?: boolean[];
}
