/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import { EmbeddableInput, EmbeddableOutput } from '@kbn/embeddable-plugin/public';

import { ExternalLinkEmbeddableStrings } from '../components/external_link/external_link_strings';
import { DashboardLinkStrings } from '../components/dashboard_link/dashboard_link_strings';

/**
 * Dashboard to dashboard links
 */
export const DASHBOARD_LINK_TYPE = 'dashboardLink';
export interface DashboardItem {
  id: string;
  attributes: DashboardAttributes;
}

/**
 * External URL links
 */
export const EXTERNAL_LINK_TYPE = 'externalLink';

/**
 * Layouts for embeddable rendering
 */
export const NAV_HORIZONTAL_LAYOUT = 'horizontal';
export const NAV_VERTICAL_LAYOUT = 'vertical';
export type NavigationLayoutType = typeof NAV_HORIZONTAL_LAYOUT | typeof NAV_VERTICAL_LAYOUT;

export const NavigationLayoutInfo: {
  [id in NavigationLayoutType]: { displayName: string };
} = {
  [NAV_HORIZONTAL_LAYOUT]: {
    displayName: i18n.translate('navigationEmbeddable.editor.horizontalLayout', {
      defaultMessage: 'Horizontal',
    }),
  },
  [NAV_VERTICAL_LAYOUT]: {
    displayName: i18n.translate('navigationEmbeddable.editor.verticalLayout', {
      defaultMessage: 'Vertical',
    }),
  },
};

/**
 * Navigation embeddable explicit input
 */
export type NavigationLinkType = typeof DASHBOARD_LINK_TYPE | typeof EXTERNAL_LINK_TYPE;

export interface NavigationEmbeddableLink {
  id: string;
  type: NavigationLinkType;
  destination: string;
  label?: string;
  order: number;
}

export interface NavigationEmbeddableLinkList {
  [id: string]: NavigationEmbeddableLink;
}

export interface NavigationEmbeddableInput extends EmbeddableInput {
  links: NavigationEmbeddableLinkList;
  layout: NavigationLayoutType;
}

export const NavigationLinkInfo: {
  [id in NavigationLinkType]: {
    icon: string;
    type: string;
    displayName: string;
    description: string;
  };
} = {
  [DASHBOARD_LINK_TYPE]: {
    icon: 'dashboardApp',
    type: DashboardLinkStrings.getType(),
    displayName: DashboardLinkStrings.getDisplayName(),
    description: DashboardLinkStrings.getDescription(),
  },
  [EXTERNAL_LINK_TYPE]: {
    icon: 'link',
    type: ExternalLinkEmbeddableStrings.getType(),
    displayName: ExternalLinkEmbeddableStrings.getDisplayName(),
    description: ExternalLinkEmbeddableStrings.getDescription(),
  },
};

/**
 *  Navigation embeddable redux state
 */
// export interface NavigationEmbeddableComponentState {} // TODO: Uncomment this if we end up needing component state

export type NavigationEmbeddableReduxState = ReduxEmbeddableState<
  NavigationEmbeddableInput,
  EmbeddableOutput,
  {} // We currently don't have any component state - TODO: Replace with `NavigationEmbeddableComponentState` if necessary
>;
