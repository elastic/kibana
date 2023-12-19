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
import type { RecentlyAccessedProps } from './components';

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

/** The preset that can be pass to the NavigationBucket component */
export type NavigationGroupPreset = 'analytics' | 'devtools' | 'ml' | 'management';

/**
 * @public
 *
 *  Definition for the "Recently accessed" section of the side navigation.
 */
export interface RecentlyAccessedDefinition extends RecentlyAccessedProps {
  type: 'recentlyAccessed';
}

/**
 * @public
 *
 * A group root item definition.
 */
export interface GroupDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends Omit<NodeDefinition<LinkId, Id, ChildrenId>, 'children'> {
  type: 'navGroup';
  children: Array<NodeDefinition<LinkId, Id, ChildrenId>>;
}

/**
 * @public
 *
 * A group root item definition built from a specific preset.
 */
export interface PresetDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends Omit<GroupDefinition<LinkId, Id, ChildrenId>, 'children' | 'type'> {
  type: 'preset';
  preset: NavigationGroupPreset;
}

/**
 * @public
 *
 * An item root.
 */
export interface ItemDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends Omit<NodeDefinition<LinkId, Id, ChildrenId>, 'children'> {
  type: 'navItem';
}

/**
 * @public
 *
 * The navigation definition for a root item in the side navigation.
 */
export type RootNavigationItemDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> =
  | RecentlyAccessedDefinition
  | GroupDefinition<LinkId, Id, ChildrenId>
  | PresetDefinition<LinkId, Id, ChildrenId>
  | ItemDefinition<LinkId, Id, ChildrenId>;

export type ProjectNavigationTreeDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> = Array<
  | Omit<GroupDefinition<LinkId, Id, ChildrenId>, 'type'>
  | Omit<ItemDefinition<LinkId, Id, ChildrenId>, 'type'>
>;

/**
 * @public
 *
 * Definition for the complete navigation tree, including body and footer
 */
export interface NavigationTreeDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> {
  /**
   * Main content of the navigation. Can contain any number of "cloudLink", "recentlyAccessed"
   * or "group" items. Be mindeful though, with great power comes great responsibility.
   * */
  body?: Array<RootNavigationItemDefinition<LinkId, Id, ChildrenId>>;
  /**
   * Footer content of the navigation. Can contain any number of "cloudLink", "recentlyAccessed"
   * or "group" items. Be mindeful though, with great power comes great responsibility.
   * */
  footer?: Array<RootNavigationItemDefinition<LinkId, Id, ChildrenId>>;
}

/**
 * @public
 *
 * A project navigation definition that can be passed to the `<DefaultNavigation />` component
 * or when calling `setNavigation()` on the serverless plugin.
 */
export interface ProjectNavigationDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> {
  /**
   * A navigation tree structure with object items containing labels, links, and sub-items
   * for a project. Use it if you only need to configure your project navigation and leave
   * all the other navigation items to the default (Recently viewed items, Management, etc.)
   */
  projectNavigationTree?: ProjectNavigationTreeDefinition<LinkId, Id, ChildrenId>;
  /**
   * A navigation tree structure with object items containing labels, links, and sub-items
   * that defines a complete side navigation. This configuration overrides `projectNavigationTree`
   * if both are provided.
   */
  navigationTree?: NavigationTreeDefinition<LinkId, Id, ChildrenId>;
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
