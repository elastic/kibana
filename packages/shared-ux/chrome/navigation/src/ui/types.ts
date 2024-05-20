/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { ReactNode } from 'react';

import type {
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  NodeDefinition,
} from '@kbn/core-chrome-browser';

/**
 * @public
 *
 * A navigation node definition with its unique id, title, path in the tree and optional deep link.
 * Those are the props that can be passed to the Navigation.Group and Navigation.Item components.
 */
export interface NodeProps<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends Omit<NodeDefinition<LinkId, Id, ChildrenId>, 'children'> {
  /**
   * Children of the node. For Navigation.Item (only) it allows a function to be set.
   * This function will receive the ChromeProjectNavigationNode object
   */
  children?: ReactNode;
  /** @internal - Prop internally controlled, don't use it. */
  parentNodePath?: string;
  /** @internal - Prop internally controlled, don't use it. */
  rootIndex?: number;
  /** @internal - Prop internally controlled, don't use it. */
  treeDepth?: number;
  /** @internal - Prop internally controlled, don't use it. */
  index?: number;
}

/**
 * @internal
 *
 * Function to unregister a navigation node from its parent.
 */
export type UnRegisterFunction = () => void;

/**
 * @internal
 *
 * A function to register a navigation node on its parent.
 */
export type RegisterFunction = (
  navNode: ChromeProjectNavigationNode,
  order?: number
) => UnRegisterFunction;
