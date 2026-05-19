import type { DEV_TOOLS_APP_ID } from './constants';
export type AppId = typeof DEV_TOOLS_APP_ID;
export type LinkId = 'searchprofiler' | 'painless_lab' | 'grokdebugger' | 'console';
export type DeepLinkId = AppId | `${AppId}:${LinkId}`;
