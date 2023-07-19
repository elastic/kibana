/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ReactElement, ReactNode } from 'react';
import type {
  AppDeepLinkId,
  ChromeProjectNavigationNode,
  NodeDefinition,
} from '@kbn/core-chrome-browser';

import type { RecentlyAccessedProps } from './components';

export type NonEmptyArray<T> = [T, ...T[]];

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
  children?: ((navNode: ChromeProjectNavigationNode) => ReactNode) | ReactNode;
}

/**
 * @internal
 *
 * Internally we enhance the Props passed to the Navigation.Item component.
 */
export interface NodePropsEnhanced<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeProps<LinkId, Id, ChildrenId> {
  /**
   * This function correspond to the same "itemRender" function that can be passed to
   * the EuiSideNavItemType (see navigation_section_ui.tsx)
   */
  renderItem?: () => ReactElement;
  /**
   * Forces the node to be active. This is used to force a collapisble nav group to be open
   * even if the URL does not match any of the nodes in the group.
   */
  isActive?: boolean;
}

/**
 * @internal
 */
export interface ChromeProjectNavigationNodeEnhanced extends ChromeProjectNavigationNode {
  /**
   * This function correspond to the same "itemRender" function that can be passed to
   * the EuiSideNavItemType (see navigation_section_ui.tsx)
   */
  renderItem?: () => ReactElement;
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
> extends NodeDefinition<LinkId, Id, ChildrenId> {
  type: 'navGroup';
  /**
   * Flag to indicate if the group is initially collapsed or not.
   *
   * `undefined`: (Recommended) the group will be opened if any of its children nodes matches the current URL.
   *
   * `false`: the group will be opened event if none of its children nodes matches the current URL.
   *
   * `true`: the group will be collapsed event if any of its children nodes matches the current URL.
   */
  defaultIsCollapsed?: boolean;
  preset?: NavigationGroupPreset;
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
> = RecentlyAccessedDefinition | GroupDefinition<LinkId, Id, ChildrenId>;

export type ProjectNavigationTreeDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> = Array<Omit<GroupDefinition<LinkId, Id, ChildrenId>, 'type'>>;

/**
 * @public
 *
 * Definition for the complete navigation tree, including body and footer
 */
export interface NavigationTreeDefinition {
  /**
   * Main content of the navigation. Can contain any number of "cloudLink", "recentlyAccessed"
   * or "group" items. Be mindeful though, with great power comes great responsibility.
   * */
  body?: RootNavigationItemDefinition[];
  /**
   * Footer content of the navigation. Can contain any number of "cloudLink", "recentlyAccessed"
   * or "group" items. Be mindeful though, with great power comes great responsibility.
   * */
  footer?: RootNavigationItemDefinition[];
}

/**
 * @public
 *
 * A project navigation definition that can be passed to the `<DefaultNavigation />` component
 * or when calling `setNavigation()` on the serverless plugin.
 */
export interface ProjectNavigationDefinition {
  /**
   * A navigation tree structure with object items containing labels, links, and sub-items
   * for a project. Use it if you only need to configure your project navigation and leave
   * all the other navigation items to the default (Recently viewed items, Management, etc.)
   */
  projectNavigationTree?: ProjectNavigationTreeDefinition;
  /**
   * A navigation tree structure with object items containing labels, links, and sub-items
   * that defines a complete side navigation. This configuration overrides `projectNavigationTree`
   * if both are provided.
   */
  navigationTree?: NavigationTreeDefinition;
}

/**
 * @internal
 *
 * Function to unregister a navigation node from its parent.
 */
export type UnRegisterFunction = (id: string) => void;

/**
 * @internal
 *
 * A function to register a navigation node on its parent.
 */
export type RegisterFunction = (navNode: ChromeProjectNavigationNodeEnhanced) => {
  /** The function to unregister the node. */
  unregister: UnRegisterFunction;
  /** The full path of the node in the navigation tree. */
  path: string[];
};
