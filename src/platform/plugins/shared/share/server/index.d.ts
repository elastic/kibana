import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
import type { ConfigSchema } from './config';
export type { SharePublicSetup as SharePluginSetup, SharePublicStart as SharePluginStart, } from './plugin';
export { CSV_QUOTE_VALUES_SETTING, CSV_SEPARATOR_SETTING } from '../common/constants';
export { TASK_ID, SAVED_OBJECT_TYPE, DEFAULT_URL_LIMIT, DEFAULT_URL_EXPIRATION_CHECK_INTERVAL, DEFAULT_URL_EXPIRATION_DURATION, } from './unused_urls_task';
export { durationToSeconds, getDeleteUnusedUrlTaskInstance, deleteUnusedUrls, fetchUnusedUrlsFromFirstNamespace, runDeleteUnusedUrlsTask, scheduleUnusedUrlsCleanupTask, } from './unused_urls_task';
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").SharePlugin>;
export declare const config: PluginConfigDescriptor<ConfigSchema>;
