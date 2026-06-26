/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ChromeComponentsProvider } from './src/context';
export type { ChromeComponentsDeps } from './src/context';

export { ClassicHeader } from './src/classic';
export { ChromeNextGlobalHeader } from './src/chrome_next';
export {
  ChromeAppHeaderRenderer,
  ProjectHeader,
  useHasChromeAppHeaderContent,
} from './src/project';
export { GridLayoutProjectSideNav } from './src/project/sidenav/grid_layout_sidenav';
export {
  AgentFirstProjectSideNav,
  AgentFirstGlobalHeader,
  type AgentFirstGlobalHeaderProps,
} from './src/agent_first';
export { AgentSlotPlaceholder } from './src/agent/agent_slot_placeholder';
export { AgentWorkspaceSlot } from './src/agent/agent_workspace_slot';
export {
  registerAgentWorkspaceContent,
  unregisterAgentWorkspaceContent,
} from './src/agent/agent_slot_registry';
export {
  registerAgentFirstAttachmentCoordinator,
  subscribeAgentFirstAttachmentCoordinator,
  getAgentFirstAttachmentCoordinator,
} from './src/agent_first/agent_first_coordinator_registry';
export { AgentFirstAttachmentCoordinatorShell } from './src/agent_first/agent_first_attachment_coordinator_shell';
export {
  registerApplicationAttachmentHarness,
  subscribeApplicationAttachmentHarness,
  getApplicationAttachmentHarness,
} from './src/agent_first/application_attachment_harness_registry';
export { ApplicationAttachmentHarnessShell } from './src/agent_first/application_attachment_harness_shell';
export { ApplicationWorkspaceBootstrap } from './src/application/application_workspace_bootstrap';
export { AgentWorkspacePanel } from './src/agent/agent_workspace_panel';
export { Sidebar } from './src/sidebar';
export { AppMenuBar } from './src/project/app_menu';
export { HeaderBreadcrumbsBadges, HeaderTopBanner, ChromelessHeader } from './src/shared';
export { useHasAppMenu, useHasInlineAppHeader } from './src/shared/chrome_hooks';
export { HeaderActionButton, type HeaderActionButtonProps } from './src/chrome_next/global_header';
