/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ComponentType } from 'react';
import type { Location } from 'history';
import type { EuiThemeSizes, IconType } from '@elastic/eui';
import type { AppId as DevToolsApp, DeepLinkId as DevToolsLink } from '@kbn/deeplinks-devtools';
import type {
  AppId as AnalyticsApp,
  DeepLinkId as AnalyticsDeepLink,
} from '@kbn/deeplinks-analytics';
import type { AppId as MlApp, DeepLinkId as MlLink } from '@kbn/deeplinks-ml';
import type {
  AppId as ManagementApp,
  DeepLinkId as ManagementLink,
} from '@kbn/deeplinks-management';
import type { AppId as SearchApp, DeepLinkId as SearchLink } from '@kbn/deeplinks-search';
import type {
  AppId as ObservabilityApp,
  DeepLinkId as ObservabilityLink,
} from '@kbn/deeplinks-observability';

import type { ChromeBreadcrumb } from './breadcrumb';
import type { ChromeNavLink } from './nav_links';

/** @public */
export type AppId =
  | DevToolsApp
  | AnalyticsApp
  | MlApp
  | ManagementApp
  | SearchApp
  | ObservabilityApp;

/** @public */
export type AppDeepLinkId =
  | AnalyticsDeepLink
  | DevToolsLink
  | MlLink
  | ManagementLink
  | SearchLink
  | ObservabilityLink;

/** @public */
export type CloudLinkId = 'userAndRoles' | 'performance' | 'billingAndSub' | 'deployment';

export type SideNavNodeStatus = 'hidden' | 'visible';

export type RenderAs = 'block' | 'accordion' | 'panelOpener' | 'item';

export type EuiThemeSize = Exclude<typeof EuiThemeSizes[number], 'base' | 'xxs' | 'xxxl' | 'xxxxl'>;

export type GetIsActiveFn = (params: {
  /** The current path name including the basePath + hash value but **without** any query params */
  pathNameSerialized: string;
  /** The history Location */
  location: Location;
  /** Utiliy function to prepend a path with the basePath */
  prepend: (path: string) => string;
}) => boolean;

/**
 * Base definition of navigation nodes. A node can either be a "group" or an "item".
 * Each have commmon properties and specific properties.
 */
interface NodeDefinitionBase {
  /**
   * Optional icon for the navigation node. Note: not all navigation depth will render the icon
   */
  icon?: IconType;
  /**
   * href for absolute links only. Internal links should use "link".
   */
  href?: string;
  /**
   * Optional status to indicate if the breadcrumb should be hidden when this node is active.
   * @default 'visible'
   */
  breadcrumbStatus?: 'hidden' | 'visible';
  /**
   * Optional status to for the side navigation. "hidden" and "visible" are self explanatory.
   * The `renderAsItem` status is _only_ for group nodes (nodes with children declared or with
   * the "nodeType" set to `group`) and allow to render the node as an "item" instead of the head of
   * a group. This is usefull to have sub-pages declared in the tree that will correctly be mapped
   * in the Breadcrumbs, but are not rendered in the side navigation.
   * @default 'visible'
   */
  sideNavStatus?: SideNavNodeStatus;
  /**
   * Optional function to get the active state. This function is called whenever the location changes.
   */
  getIsActive?: GetIsActiveFn;
  /**
   * Add vertical space before this node
   */
  spaceBefore?: EuiThemeSize | null;
  /**
   * ----------------------------------------------------------------------------------------------
   * ------------------------------- GROUP NODES ONLY PROPS ---------------------------------------
   * ----------------------------------------------------------------------------------------------
   */
  /**
   * ["group" nodes only] Property to indicate how the group should be rendered.
   * - Accordion: wraps the items in an EuiAccordion
   * - PanelOpener: renders a button to open a panel on the right of the side nav
   * - item: renders the group as an item in the side nav
   * @default 'block'
   */
  renderAs?: RenderAs;
  /**
   * ["group" nodes only] Flag to indicate if the group is initially collapsed or not.
   *
   * `undefined`: (Recommended) the group will be opened if any of its children nodes matches the current URL.
   *
   * `false`: the group will be opened event if none of its children nodes matches the current URL.
   *
   * `true`: the group will be collapsed event if any of its children nodes matches the current URL.
   */
  defaultIsCollapsed?: boolean;
  /**
   * ["group" nodes only] Optional flag to indicate if a horizontal rule should be rendered after the node.
   * Note: this property is currently only used for (1) "group" nodes and (2) in the navigation
   * panel opening on the right of the side nav.
   */
  appendHorizontalRule?: boolean;
  /**
   * ["group" nodes only] Flag to indicate if the accordion is collapsible.
   * Must be used with `renderAs` set to `"accordion"`
   * @default `true`
   */
  isCollapsible?: boolean;
  /**
   * ----------------------------------------------------------------------------------------------
   * -------------------------------- ITEM NODES ONLY PROPS ---------------------------------------
   * ----------------------------------------------------------------------------------------------
   */
  /**
   * ["item" nodes only] Optional flag to indicate if the target page should be opened in a new Browser tab.
   * Note: this property is currently only used in the navigation panel opening on the right of the side nav.
   */
  openInNewTab?: boolean;
  /**
   * ["item" nodes only] Optional flag to indicate if a badge should be rendered next to the text.
   * Note: this property is currently only used in the navigation panel opening on the right of the side nav.
   */
  withBadge?: boolean;
  /**
   * ["item" nodes only] If `withBadge` is true, this object can be used to customize the badge.
   */
  badgeOptions?: {
    /** The text of the badge. Default: "Beta" */
    text?: string;
  };
}

/** @public */
/**
 * Chrome project navigation node. This is the tree definition stored in the Chrome service
 * that is generated based on the NodeDefinition below.
 * Some of the process that occurs between the 2 are:
 * - "link" prop get converted to existing ChromNavLink
 * - "path" is added to each node based on where it is located in the tree
 * - "isActive" state is set for each node if its URL matches the current location
 */
export interface ChromeProjectNavigationNode extends NodeDefinitionBase {
  /** Optional id, if not passed a "link" must be provided. */
  id: string;
  /** Optional title. If not provided and a "link" is provided the title will be the Deep link title */
  title: string;
  /** Path in the tree of the node */
  path: string[];
  /** App id or deeplink id */
  deepLink?: ChromeNavLink;
  /**
   * Optional children of the navigation node. Once a node has "children" defined it is
   * considered a "group" node.
   */
  children?: ChromeProjectNavigationNode[];
  /**
   * Flag to indicate if the node is currently active.
   */
  isActive?: boolean;
}

/** @public */
export interface ChromeProjectNavigation {
  /**
   * The navigation tree representation of the side bar navigation.
   */
  navigationTree: ChromeProjectNavigationNode[];
}

/** @public */
export interface SideNavCompProps {
  activeNodes: ChromeProjectNavigationNode[][];
}

/** @public */
export type SideNavComponent = ComponentType<SideNavCompProps>;

/** @public */
export type ChromeProjectBreadcrumb = ChromeBreadcrumb;

/** @public */
export interface ChromeSetProjectBreadcrumbsParams {
  absolute: boolean;
}

// --- NOTE: The following types are the ones that the consumer uses to configure their navigation.
// ---       They are converted to the ChromeProjectNavigationNode type above.

/**
 * @public
 *
 * A navigation node definition with its unique id, title, path in the tree and optional
 * deep link and children.
 * This definition serves to build the full ChromeProjectNavigation.navigationTree, converting
 * "link" to "deepLink" and adding the "path" property for each node.
 */
export interface NodeDefinition<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenId extends string = Id
> extends NodeDefinitionBase {
  /** Optional id, if not passed a "link" must be provided. */
  id?: Id;
  /** Optional title. If not provided and a "link" is provided the title will be the Deep link title */
  title?: string;
  /** App id or deeplink id */
  link?: LinkId;
  /** Cloud link id */
  cloudLink?: CloudLinkId;
  /** Optional children of the navigation node. Can not be used with `isGroupTitle` */
  children?: Array<NodeDefinition<LinkId, Id, ChildrenId>>;
}

/**
 * @public
 *
 * A navigation node definition with its unique id, title, path in the tree and optional
 * deep link and children.
 */
export type NodeDefinitionWithChildren<
  LinkId extends AppDeepLinkId = AppDeepLinkId,
  Id extends string = string,
  ChildrenID extends string = Id
> = NodeDefinition<LinkId, Id, ChildrenID> & {
  children: Required<NodeDefinition<LinkId, Id, ChildrenID>>['children'];
};
