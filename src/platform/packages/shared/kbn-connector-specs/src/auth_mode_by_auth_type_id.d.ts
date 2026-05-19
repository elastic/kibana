import type { AuthMode } from './connector_spec';
export declare const AUTH_MODE_BY_AUTH_TYPE_ID: Record<string, AuthMode>;
export declare function getAuthModeForAuthTypeId(authTypeId: string): AuthMode;
