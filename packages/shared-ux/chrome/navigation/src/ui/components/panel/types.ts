/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactNode, ComponentType } from 'react';
import type { ChromeProjectNavigationNode } from '@kbn/core-chrome-browser';

export interface PanelComponentProps {
  /** Handler to close the panel */
  closePanel: () => void;
  /** The node in the main panel that opens the secondary panel */
  selectedNode: PanelNavNode;
  /** Jagged array of active nodes that match the current URL location  */
  activeNodes: ChromeProjectNavigationNode[][];
}

export interface PanelContent {
  title?: ReactNode | string;
  content?: ComponentType<PanelComponentProps>;
}

export type ContentProvider = (nodeId: string) => PanelContent | void;

export type PanelNavNode = Pick<
  ChromeProjectNavigationNode,
  'id' | 'children' | 'path' | 'sideNavStatus' | 'deepLink'
> & {
  title: string | ReactNode;
};
