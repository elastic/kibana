/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavigationEmbeddableCrudTypes } from './types';
export type {
  NavigationEmbeddableCrudTypes,
  NavigationEmbeddableAttributes,
  NavigationEmbeddableLink,
  NavigationLayoutType,
  NavigationLinkType,
} from './types';
export type NavigationEmbeddableItem = NavigationEmbeddableCrudTypes['Item'];
export {
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  NAV_VERTICAL_LAYOUT,
  NAV_HORIZONTAL_LAYOUT,
  EXTERNAL_LINK_SUPPORTED_PROTOCOLS,
} from './constants';
