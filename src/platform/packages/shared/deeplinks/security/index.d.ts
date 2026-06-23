import type { SecurityPageName } from './deep_links';
export { SecurityPageName } from './deep_links';
export declare const SECURITY_APP_ID = "securitySolutionUI";
export type AppId = typeof SECURITY_APP_ID;
export type LinkId = `${SecurityPageName}`;
export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
