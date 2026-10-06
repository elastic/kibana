/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { CardsNavigationComponentProps, AppId, AppDefinition } from './types';
type AggregatedCardNavDefinitions =
  | NonNullable<CardsNavigationComponentProps['extendedCardNavigationDefinitions']>
  | Record<AppId, AppDefinition>;
export declare const getAppIdsByCategory: (
  category: string,
  appDefinitions: AggregatedCardNavDefinitions
) => (
  | 'api_keys'
  | 'application_connections'
  | 'content_connectors'
  | 'dataViews'
  | 'data_quality'
  | 'data_usage'
  | 'filesManagement'
  | 'index_management'
  | 'ingest_pipelines'
  | 'jobsListLink'
  | 'maintenanceWindows'
  | 'objects'
  | 'pipelines'
  | 'reporting'
  | 'roles'
  | 'settings'
  | 'spaces'
  | 'tags'
  | 'transform'
  | 'triggersActions'
  | 'triggersActionsConnectors'
)[];
export declare const CardsNavigation: ({
  sections,
  appBasePath,
  onCardClick,
  hideLinksTo,
  extendedCardNavigationDefinitions,
}: CardsNavigationComponentProps) => React.JSX.Element;
export {};
