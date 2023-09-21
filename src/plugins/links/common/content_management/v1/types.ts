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
import { type UrlDrilldownOptions } from '@kbn/ui-actions-enhanced-plugin/public';
import { type DashboardDrilldownOptions } from '@kbn/presentation-util-plugin/public';

import { LinksContentType } from '../../types';
import {
  DASHBOARD_LINK_TYPE,
  EXTERNAL_LINK_TYPE,
  LINKS_HORIZONTAL_LAYOUT,
  LINKS_VERTICAL_LAYOUT,
} from './constants';

export type LinksCrudTypes = ContentManagementCrudTypes<
  LinksContentType,
  LinksAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  {
    /** Flag to indicate to only search the text on the "title" field */
    onlyTitle?: boolean;
  }
>;

export type LinkType = typeof DASHBOARD_LINK_TYPE | typeof EXTERNAL_LINK_TYPE;

export type LinkOptions = DashboardDrilldownOptions | UrlDrilldownOptions;
interface BaseLink {
  id: string;
  label?: string;
  order: number;
  options?: LinkOptions;
  destination?: string;
}

interface DashboardLink extends BaseLink {
  type: typeof DASHBOARD_LINK_TYPE;
  destinationRefName?: string;
}

interface ExternalLink extends BaseLink {
  type: typeof EXTERNAL_LINK_TYPE;
  destination: string;
}

export type Link = DashboardLink | ExternalLink;

export type LinksLayoutType = typeof LINKS_HORIZONTAL_LAYOUT | typeof LINKS_VERTICAL_LAYOUT;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type LinksAttributes = {
  title: string;
  description?: string;
  links?: Link[];
  layout?: LinksLayoutType;
};
