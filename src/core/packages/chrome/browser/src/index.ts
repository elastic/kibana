/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  ChromeBreadcrumbsAppendExtension,
  ChromeBreadcrumb,
  ChromeSetBreadcrumbsParams,
} from './breadcrumb';
export type { ChromeStart } from './contracts';
export type { ChromeDocTitle } from './doc_title';
export type {
  ChromeHelpExtension,
  ChromeHelpMenuActions,
  ChromeHelpExtensionLinkBase,
  ChromeHelpExtensionMenuLink,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeGlobalHelpExtensionMenuLink,
} from './help_extension';
export type { ChromeNavControls, ChromeNavControl, ChromeHelpMenuLink } from './nav_controls';
export type { ChromeNavLinks, ChromeNavLink } from './nav_links';
export type {
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
} from './recently_accessed';
export type { ChromeBadge, ChromeUserBanner, ChromeStyle } from './types';

export type {
  ChromeProjectNavigationNode,
  PanelSelectedNode,
  AppDeepLinkId,
  AppId,
  SolutionId,
  CloudLinkId,
  CloudLink,
  CloudLinks,
  CloudURLs,
  SideNavNodeStatus,
  ChromeSetProjectBreadcrumbsParams,
  NodeDefinition,
  NodeDefinitionWithChildren,
  RenderAs as NodeRenderAs,
  EuiThemeSize,
  NavigationTreeDefinition,
  GroupDefinition,
  ItemDefinition,
  PresetDefinition,
  RecentlyAccessedDefinition,
  NavigationGroupPreset,
  RootNavigationItemDefinition,
  NavigationTreeDefinitionUI,
  SolutionNavigationDefinition,
  SolutionNavigationDefinitions,
  EuiSideNavItemTypeEnhanced,
  RenderAs,
} from './project_navigation';

export {
  WORKSPACE_KNOWN_SIDEBAR_APPS,
  WORKSPACE_SIDEBAR_APP_AI_ASSISTANT,
  WORKSPACE_SIDEBAR_APP_FEEDBACK,
  WORKSPACE_SIDEBAR_APP_HELP,
  WORKSPACE_SIDEBAR_APP_NEWSFEED,
  WORKSPACE_SIDEBAR_APP_PROFILE,
  WORKSPACE_SIDEBAR_APP_RECENT,
} from './workspace';

export type {
  WorkspaceSidebarAppProps,
  WorkspaceKnownSidebarApp,
  WorkspaceHeaderService,
  WorkspaceHeaderState,
  WorkspaceServiceStart,
  WorkspaceSidebarApp,
  WorkspaceButtonProps,
  WorkspaceSidebarService,
  WorkspaceSidebarState,
  WorkspaceNavigationService,
  WorkspaceService,
  WorkspaceServiceState,
  WorkspaceNavigationState,
} from './workspace';
