import type { PluginInitializerContext } from '@kbn/core/public';
import { ManagementPlugin } from './plugin';
export declare function plugin(initializerContext: PluginInitializerContext): ManagementPlugin;
export type { RegisterManagementAppArgs } from './utils';
export { ManagementSection, ManagementApp } from './utils';
export type { ManagementAppMountParams, ManagementSetup, ManagementStart, DefinedSections, AutoOpsStatusHook, AutoOpsStatusResult, } from './types';
export { MANAGEMENT_APP_ID } from '../common/contants';
