/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, MouseEventHandler } from 'react';
import type { Location } from 'history';
import type { EuiSideNavItemType, EuiThemeSizes, IconType } from '@elastic/eui';
import type { Observable } from 'rxjs';
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
import type {
  EnterpriseSearchApp,
  EnterpriseSearchContentApp,
  EnterpriseSearchApplicationsApp,
  EnterpriseSearchAnalyticsApp,
  EnterpriseSearchAppsearchApp,
  EnterpriseSearchWorkplaceSearchApp,
  ServerlessSearchApp,
  DeepLinkId as SearchLink,
} from '@kbn/deeplinks-search';
import type {
  AppId as ObservabilityApp,
  DeepLinkId as ObservabilityLink,
} from '@kbn/deeplinks-observability';
import type { AppId as SecurityApp, DeepLinkId as SecurityLink } from '@kbn/deeplinks-security';
import type { AppId as FleetApp, DeepLinkId as FleetLink } from '@kbn/deeplinks-fleet';
import type { AppId as SharedApp, DeepLinkId as SharedLink } from '@kbn/deeplinks-shared';

import type { ChromeBreadcrumb } from './breadcrumb';
import type { ChromeNavLink } from './nav_links';
import type { ChromeRecentlyAccessedHistoryItem } from './recently_accessed';

/** @public */
export type AppId =
  | DevToolsApp
  | AnalyticsApp
  | MlApp
  | ManagementApp
  | EnterpriseSearchApp
  | EnterpriseSearchContentApp
  | EnterpriseSearchApplicationsApp
  | EnterpriseSearchAnalyticsApp
  | EnterpriseSearchAppsearchApp
  | EnterpriseSearchWorkplaceSearchApp
  | ServerlessSearchApp
  | ObservabilityApp
  | SecurityApp
  | FleetApp
  | SharedApp;

/** @public */
export type AppDeepLinkId =
  | AnalyticsDeepLink
  | DevToolsLink
  | MlLink
  | ManagementLink
  | SearchLink
  | ObservabilityLink
  | SecurityLink
  | FleetLink
  | SharedLink;

/** @public */
export type CloudLinkId =
  | 'userAndRoles'
  | 'performance'
  | 'billingAndSub'
  | 'deployment'
  | 'deployments'
  | 'projects';

export interface CloudURLs {
  baseUrl?: string;
  billingUrl?: string;
  deploymentsUrl?: string;
  deploymentUrl?: string;
  projectsUrl?: string;
  performanceUrl?: string;
  usersAndRolesUrl?: string;
}

export interface CloudLink {
  title: string;
  href: string;
}

export type CloudLinks = {
  [id in CloudLinkId]?: CloudLink;
};

export type SideNavNodeStatus = 'hidden' | 'visible';

export type RenderAs = 'block' | 'accordion' | 'panelOpener' | 'item';

export type EuiThemeSize = Exclude<
  (typeof EuiThemeSizes)[number],
  'base' | 'xxs' | 'xxxl' | 'xxxxl'
>;

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
   * Custom handler to execute when clicking on the node. This handler takes precedence over the "link" or "href" props.
   */
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLElement>;
  /**
   * Optional status to indicate if the breadcrumb should be hidden when this node is active.
   * @default 'visible'
   */
  breadcrumbStatus?: 'hidden' | 'visible';
  /**
   * Optional status to indicate if the node should be hidden in the side nav (but still present in the navigation tree).
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
  path: string;
  /** App id or deeplink id */
  deepLink?: ChromeNavLink;
  /**
   * Optional children of the navigation node. Once a node has "children" defined it is
   * considered a "group" node.
   */
  children?: ChromeProjectNavigationNode[];
  /**
   * Handler to render the node item with custom JSX. This handler is added to render the `children` of
   * the Navigation.Item component when React components are used to declare the navigation tree.
   */
  renderItem?: () => React.ReactNode;
  /**
   * Flag to indicate if the node is an "external" cloud link
   */
  isElasticInternalLink?: boolean;
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

/** The preset that can be pass to the NavigationBucket component */
export type NavigationGroupPreset = 'analytics' | 'devtools' | 'ml' | 'management';

/**
 * @public
 *
 *  Definition for the "Recently accessed" section of the side navigation.
 */
export interface RecentlyAccessedDefinition {
  type: 'recentlyAccessed';
  /**
   * Optional observable for recently accessed items. If not provided, the
   * recently items from the Chrome service will be used.
   */
  recentlyAccessed$?: Observable<ChromeRecentlyAccessedHistoryItem[]>;
  /**
   * If true, the recently accessed list will be collapsed by default.
   * @default false
   */
  defaultIsCollapsed?: boolean;
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
 * An navigation item at root level.
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
   * or "group" items.
   * */
  body: Array<RootNavigationItemDefinition<LinkId, Id, ChildrenId>>;
  /**
   * Footer content of the navigation. Can contain any number of "cloudLink", "recentlyAccessed"
   * or "group" items.
   * */
  footer?: Array<RootNavigationItemDefinition<LinkId, Id, ChildrenId>>;
}

/**
 * @public
 *
 * Definition for the complete navigation tree, including body and footer
 * that is used by the UI to render the navigation.
 * This interface is the result of parsing the definition above (validating, replacing "link" props
 * with their corresponding "deepLink"...)
 */
export interface NavigationTreeDefinitionUI {
  body: Array<ChromeProjectNavigationNode | RecentlyAccessedDefinition>;
  footer?: Array<ChromeProjectNavigationNode | RecentlyAccessedDefinition>;
}

/**
 * @public
 *
 * Definition for a solution navigation in stateful Kibana.
 *
 * This definition is used to register a solution navigation in the Chrome service
 * for the side navigation evolution to align with the Serverless UX.
 */

export interface SolutionNavigationDefinition<LinkId extends AppDeepLinkId = AppDeepLinkId> {
  /** Unique id for the solution navigation. */
  id: string;
  /** Title for the solution navigation. */
  title: string;
  /** The navigation tree definition */
  navigationTree$: Observable<NavigationTreeDefinition<LinkId>>;
  /** Optional icon for the solution navigation to render in the select dropdown. */
  icon?: IconType;
  /** React component to render in the side nav for the navigation */
  sideNavComponent?: SideNavComponent;
  /** The page to navigate to when clicking on the Kibana (or custom) logo. */
  homePage?: LinkId;
}

export interface SolutionNavigationDefinitions {
  [id: string]: SolutionNavigationDefinition;
}

/**
 * Temporary helper interface while we have to maintain both the legacy side navigation
 * and the new "solution view" one. The legacy uses EuiSideNavItemType and its properties are not fully compatible
 * with the NodeDefinition. Solution teams declare their "classic" navigation using the EuiSideNavItemType.
 * Converting those to the `NodeDefinition` require some additional props.
 */
export type EuiSideNavItemTypeEnhanced<T = unknown> = Omit<EuiSideNavItemType<T>, 'items'> & {
  items?: Array<EuiSideNavItemTypeEnhanced<unknown>>;
  iconToString?: string;
  nameToString?: string;
};
