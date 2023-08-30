/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReduxEmbeddableState } from '@kbn/presentation-util-plugin/public';
import {
  EmbeddableInput,
  EmbeddableOutput,
  SavedObjectEmbeddableInput,
} from '@kbn/embeddable-plugin/public';

import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import {
  NavigationLinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  NAV_VERTICAL_LAYOUT,
  NavigationLayoutType,
  NAV_HORIZONTAL_LAYOUT,
  NavigationEmbeddableAttributes,
} from '../../common/content_management';
import { DashboardLinkStrings } from '../components/dashboard_link/dashboard_link_strings';
import { ExternalLinkStrings } from '../components/external_link/external_link_strings';
import { NavEmbeddableStrings } from '../components/navigation_embeddable_strings';

export const NavigationLayoutInfo: {
  [id in NavigationLayoutType]: { displayName: string };
} = {
  [NAV_HORIZONTAL_LAYOUT]: {
    displayName: NavEmbeddableStrings.editor.panelEditor.getHorizontalLayoutLabel(),
  },
  [NAV_VERTICAL_LAYOUT]: {
    displayName: NavEmbeddableStrings.editor.panelEditor.getVerticalLayoutLabel(),
  },
};

export interface DashboardItem {
  id: string;
  attributes: DashboardAttributes;
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
    type: ExternalLinkStrings.getType(),
    displayName: ExternalLinkStrings.getDisplayName(),
    description: ExternalLinkStrings.getDescription(),
  },
};

export type NavigationEmbeddableByValueInput = {
  attributes: NavigationEmbeddableAttributes;
} & EmbeddableInput;

export type NavigationEmbeddableByReferenceInput = SavedObjectEmbeddableInput;

export type NavigationEmbeddableInput =
  | NavigationEmbeddableByValueInput
  | NavigationEmbeddableByReferenceInput;

export type NavigationEmbeddableOutput = EmbeddableOutput & {
  attributes?: NavigationEmbeddableAttributes;
};

/**
 *  Navigation embeddable redux state
 */
export type NavigationEmbeddableComponentState = NavigationEmbeddableAttributes;

export type NavigationEmbeddableReduxState = ReduxEmbeddableState<
  NavigationEmbeddableInput,
  NavigationEmbeddableOutput,
  NavigationEmbeddableComponentState
>;
