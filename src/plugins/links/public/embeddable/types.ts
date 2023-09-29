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
  LinkType,
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LINKS_VERTICAL_LAYOUT,
  LinksLayoutType,
  LINKS_HORIZONTAL_LAYOUT,
  LinksAttributes,
} from '../../common/content_management';
import { DashboardLinkStrings } from '../components/dashboard_link/dashboard_link_strings';
import { ExternalLinkStrings } from '../components/external_link/external_link_strings';
import { LinksStrings } from '../components/links_strings';

export const LinksLayoutInfo: {
  [id in LinksLayoutType]: { displayName: string };
} = {
  [LINKS_HORIZONTAL_LAYOUT]: {
    displayName: LinksStrings.editor.panelEditor.getHorizontalLayoutLabel(),
  },
  [LINKS_VERTICAL_LAYOUT]: {
    displayName: LinksStrings.editor.panelEditor.getVerticalLayoutLabel(),
  },
};

export interface DashboardItem {
  id: string;
  attributes: DashboardAttributes;
}

export const LinkInfo: {
  [id in LinkType]: {
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

export interface LinksEditorFlyoutReturn {
  attributes?: unknown;
  newInput: Partial<LinksInput>;
}

export type LinksByValueInput = {
  attributes: LinksAttributes;
} & EmbeddableInput;

export type LinksByReferenceInput = SavedObjectEmbeddableInput;

export type LinksInput = LinksByValueInput | LinksByReferenceInput;

export type LinksOutput = EmbeddableOutput & {
  attributes?: LinksAttributes;
};

/**
 *  Links embeddable redux state
 */
export type LinksComponentState = LinksAttributes;

export type LinksReduxState = ReduxEmbeddableState<LinksInput, LinksOutput, LinksComponentState>;
