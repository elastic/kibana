/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';
import { NavigationEmbeddableContentType } from '../../types';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  NAV_HORIZONTAL_LAYOUT,
  NAV_VERTICAL_LAYOUT,
} from './constants';

export type NavigationEmbeddableCrudTypes = ContentManagementCrudTypes<
  NavigationEmbeddableContentType,
  NavigationEmbeddableAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

/**
 * Navigation embeddable explicit input
 */
export type NavigationLinkType = typeof DASHBOARD_LINK_TYPE | typeof EXTERNAL_LINK_TYPE;

interface BaseNavigationEmbeddableLink {
  id: string;
  label?: string;
  order: number;
  destination?: string;
}

interface DashboardLink extends BaseNavigationEmbeddableLink {
  type: typeof DASHBOARD_LINK_TYPE;
  destinationRefName?: string;
}

interface ExternalLink extends BaseNavigationEmbeddableLink {
  type: typeof EXTERNAL_LINK_TYPE;
  destination: string;
}

export type NavigationEmbeddableLink = DashboardLink | ExternalLink;

export type NavigationLayoutType = typeof NAV_HORIZONTAL_LAYOUT | typeof NAV_VERTICAL_LAYOUT;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type NavigationEmbeddableAttributes = {
  title: string;
  description?: string;
  links?: NavigationEmbeddableLink[];
  layout?: NavigationLayoutType;
};
