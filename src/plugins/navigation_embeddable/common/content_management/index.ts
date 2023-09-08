/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LATEST_VERSION, CONTENT_ID } from '../constants';

export type { NavigationEmbeddableContentType } from '../types';

export type {
  NavigationLinkType,
  NavigationLayoutType,
  NavigationLinkOptions,
  NavigationEmbeddableLink,
  NavigationEmbeddableItem,
  NavigationEmbeddableCrudTypes,
  NavigationEmbeddableAttributes,
} from './latest';

export {
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  NAV_VERTICAL_LAYOUT,
  NAV_HORIZONTAL_LAYOUT,
} from './latest';

export * as NavigationEmbeddableV1 from './v1';
