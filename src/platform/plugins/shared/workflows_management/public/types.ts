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
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { TriggersAndActionsUIPublicPluginSetup } from '@kbn/triggers-actions-ui-plugin/public';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPublicPluginSetup {}

export interface WorkflowsPublicPluginSetupDependencies {
  triggersActionsUi: TriggersAndActionsUIPublicPluginSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPublicPluginStart {}

export interface WorkflowsPublicPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
  serverless?: ServerlessPluginStart;
  dataViews: DataViewsPublicPluginStart;
  fieldFormats: FieldFormatsStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  data: DataPublicPluginStart;
  spaces: SpacesPluginStart;
}

export interface WorkflowsPublicPluginStartAdditionalServices {
  storage: Storage;
}

export type WorkflowsServices = CoreStart &
  WorkflowsPublicPluginStartDependencies &
  WorkflowsPublicPluginStartAdditionalServices;

export interface WorkflowsSearchParams {
  limit: number;
  page: number;
  query?: string;
  createdBy?: string[];
  enabled?: boolean[];
}
