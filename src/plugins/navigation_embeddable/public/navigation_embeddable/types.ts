/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common';

export interface ExternalLink {
  url: string;
  label?: string;
}
export interface DashboardLink {
  id: string;
  title?: string;
  label?: string;
  description?: string;
}

export interface DashboardItem {
  id: string;
  attributes: DashboardAttributes;
}

/**
 * Explicit Input
 */
export type IExternalLink = ExternalLink & { order: number };

export type IDashboardLink = Pick<DashboardLink, 'id' | 'label'> & { order: number };

export const isDashboardLink = (
  link: DashboardLink | ExternalLink
): link is IDashboardLink | DashboardLink => {
  return Boolean((link as IDashboardLink).id);
};

export interface NavigationEmbeddableInput extends EmbeddableInput {
  links?: { [id: string]: IExternalLink | IDashboardLink };
}

/**
 * Redux state
 */
export interface NavigationEmbeddableComponentState {
  totalDashboards?: number;
  currentDashboardId?: string;
  dashboardList?: DashboardItem[];
  links?: Array<DashboardLink | ExternalLink>;
}

export type NavigationEmbeddableReduxState = ReduxEmbeddableState<
  NavigationEmbeddableInput,
  EmbeddableOutput,
  NavigationEmbeddableComponentState
>;
