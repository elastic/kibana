/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LinksCrudTypes } from './types';
export type {
  LinksCrudTypes,
  LinksAttributes,
  Link,
  LinkOptions,
  LinksLayoutType,
  LinkType,
} from './types';
export type LinksItem = LinksCrudTypes['Item'];
export {
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LINKS_VERTICAL_LAYOUT,
  LINKS_HORIZONTAL_LAYOUT,
} from './constants';
