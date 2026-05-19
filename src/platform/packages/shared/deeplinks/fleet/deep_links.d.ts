export declare const FLEET_APP_ID = "fleet";
export type AppId = typeof FLEET_APP_ID;
export type LinkId = 'agents' | 'policies' | 'enrollment_tokens' | 'uninstall_tokens' | 'data_streams' | 'settings';
export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
