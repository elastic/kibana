/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { DashboardItem } from '@kbn/dashboard-plugin/common/content_management';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';

export interface DashboardLink {
  id: string;
  title?: string;
  label?: string;
  description?: string;
}

export interface NavigationEmbeddableInput extends EmbeddableInput {
  dashboardLinks?: Array<Pick<DashboardLink, 'id' | 'label'>>;
}

export interface NavigationEmbeddableComponentState {
  totalDashboards?: number;
  currentDashboardId?: string;
  dashboardList?: DashboardItem[];
  dashboardLinks?: DashboardLink[];
}

export type NavigationEmbeddableReduxState = ReduxEmbeddableState<
  NavigationEmbeddableInput,
  EmbeddableOutput,
  NavigationEmbeddableComponentState
>;
