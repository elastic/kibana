import type { WorkflowsPageName } from './deep_links';
export { WorkflowsPageName } from './deep_links';
export declare const WORKFLOWS_APP_ID = "workflows";
export type AppId = typeof WORKFLOWS_APP_ID;
export type LinkId = `${WorkflowsPageName}`;
export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
