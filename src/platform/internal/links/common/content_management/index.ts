/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { LATEST_VERSION, CONTENT_ID } from '../constants';

export type { LinksContentType } from '../types';

export type {
  LinkType,
  LinksLayoutType,
  LinkOptions,
  Link,
  LinksItem,
  LinksCrudTypes,
  LinksAttributes,
} from './latest';

export {
  EXTERNAL_LINK_TYPE,
  DASHBOARD_LINK_TYPE,
  LINKS_VERTICAL_LAYOUT,
  LINKS_HORIZONTAL_LAYOUT,
} from './latest';

export * as LinksV1 from './v1';
