import { DevToolsPlugin } from './plugin';
export type { DevToolsSetup } from './plugin';
export { DevToolsPlugin } from './plugin';
export { DEV_TOOLS_FEATURE_ID, ENABLE_PERSISTENT_CONSOLE_UI_SETTING_ID } from '../common/constants';
export declare function plugin(): DevToolsPlugin;
