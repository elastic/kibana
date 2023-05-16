/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface NavigationNode {
  /** Optional id. If not provided a "link" must be passed */
  id?: string;
  /** Optional deepLink id. If not provided an "id" must be passed */
  link?: string;
  /** Optional title, if not provided we'll read the DeepLink title */
  title?: string;
  /** eui icon type if needed */
  icon?: string;
  /** Optional sub navigation */
  items?: NavigationNode[];
}

export interface InternalNavigationNode extends Omit<NavigationNode, 'id'> {
  id: string;
}
