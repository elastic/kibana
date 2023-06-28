/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import {
  ContainerInput,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  PanelState,
} from '@kbn/embeddable-plugin/public';

// export interface ExternalLink {
//   url: string;
//   label?: string;
// }

export interface LinkInput extends EmbeddableInput {
  label?: string;
}

export type LinkEmbeddable<
  I extends LinkInput = LinkInput,
  O extends EmbeddableOutput = EmbeddableOutput
> = IEmbeddable<I, O>;

export type LinkFactory = EmbeddableFactory<LinkInput, EmbeddableOutput, LinkEmbeddable>;

/**
 * Explicit Input
 */
// export type IExternalLink = ExternalLink & { order: number };

// export type IDashboardLink = Pick<DashboardLink, 'id' | 'label'> & { order: number };

// export const isDashboardLink = (
//   link: DashboardLink | ExternalLink | undefined
// ): link is IDashboardLink | DashboardLink => {
//   return Boolean(link && (link as IDashboardLink).id);
// };

export interface LinkPanelState<TEmbeddableInput extends LinkInput = LinkInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
}

export interface LinkPanels {
  [panelId: string]: LinkPanelState;
}

export interface NavigationContainerInput extends EmbeddableInput, ContainerInput {
  panels: LinkPanels;
}

/**
 * Redux state
 */
export interface NavigationContainerComponentState {
  canEdit?: boolean;
  totalDashboards?: number;
  dashboardList?: DashboardItem[];
  currentDashboard?: DashboardLink;
  links?: Array<DashboardLink | ExternalLink>;
}

export type NavigationContainerReduxState = ReduxEmbeddableState<
  NavigationContainerInput,
  ContainerOutput,
  NavigationContainerComponentState
>;
