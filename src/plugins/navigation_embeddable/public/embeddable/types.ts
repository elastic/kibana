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

import { ExternalLinkEmbeddableStrings } from '../components/external_link/external_link_strings';
import { DashboardLinkEmbeddableStrings } from '../components/dashboard_link/dashboard_link_strings';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  NavigationLinkType,
  NavigationEmbeddableAttributes,
} from '../../common/content_management';

export const NavigationLinkInfo: {
  [id in NavigationLinkType]: { icon: string; displayName: string; description: string };
} = {
  [DASHBOARD_LINK_TYPE]: {
    icon: 'dashboardApp',
    displayName: DashboardLinkEmbeddableStrings.getDisplayName(),
    description: DashboardLinkEmbeddableStrings.getDescription(),
  },
  [EXTERNAL_LINK_TYPE]: {
    icon: 'link',
    displayName: ExternalLinkEmbeddableStrings.getDisplayName(),
    description: ExternalLinkEmbeddableStrings.getDescription(),
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
// export interface NavigationEmbeddableComponentState {} // TODO: Uncomment this if we end up needing component state

export type NavigationEmbeddableReduxState = ReduxEmbeddableState<
  NavigationEmbeddableInput,
  NavigationEmbeddableOutput,
  {} // We currently don't have any component state - TODO: Replace with `NavigationEmbeddableComponentState` if necessary
>;
