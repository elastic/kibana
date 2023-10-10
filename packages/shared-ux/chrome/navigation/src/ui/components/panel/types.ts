/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactNode } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

export interface PanelContent {
  title?: ReactNode | string;
  content?: ReactNode;
}

export type ContentProvider = (nodeId: string) => PanelContent | void;

export type PanelNavNode = Pick<
  ChromeProjectNavigationNode,
  'id' | 'children' | 'path' | 'nodeType' | 'sideNavStatus'
> & {
  title: string | ReactNode;
};
