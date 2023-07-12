/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DashboardAttributes } from '@kbn/dashboard-plugin/common';
import { EmbeddableInput } from '@kbn/embeddable-plugin/common';

export type NavigationEmbeddableContentType = 'navigationEmbeddable';

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
 * Navigation embeddable explicit input
 */
export type NavigationLinkType = typeof DASHBOARD_LINK_TYPE | typeof EXTERNAL_LINK_TYPE;

export interface NavigationEmbeddableLink {
  type: NavigationLinkType;
  destination: string;
  // order: number; TODO: Use this as part of https://github.com/elastic/kibana/issues/154361
  label?: string;
}

export interface NavigationEmbeddableInput extends EmbeddableInput {
  links: { [id: string]: NavigationEmbeddableLink };
}
