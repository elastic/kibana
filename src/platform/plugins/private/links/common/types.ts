/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsResolveResponse } from '@kbn/core-saved-objects-api-server';

export interface SharingSavedObjectProps {
  outcome: SavedObjectsResolveResponse['outcome'];
  aliasTargetId?: SavedObjectsResolveResponse['alias_target_id'];
  aliasPurpose?: SavedObjectsResolveResponse['alias_purpose'];
  sourceId?: string;
}

/**
 * Link types
 */
export const DASHBOARD_LINK_TYPE = 'dashboardLink';
export const EXTERNAL_LINK_TYPE = 'externalLink';
export type LinkType = typeof DASHBOARD_LINK_TYPE | typeof EXTERNAL_LINK_TYPE;

/**
 * Layout options
 */
export const LINKS_HORIZONTAL_LAYOUT = 'horizontal';
export const LINKS_VERTICAL_LAYOUT = 'vertical';
export type LinksLayoutType = typeof LINKS_HORIZONTAL_LAYOUT | typeof LINKS_VERTICAL_LAYOUT;
