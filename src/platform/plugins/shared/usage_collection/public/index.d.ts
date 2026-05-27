import type { PluginInitializerContext } from '@kbn/core/public';
import { UsageCollectionPlugin } from './plugin';
export type { UsageCollectionSetup, UsageCollectionStart } from './plugin';
export { TrackApplicationView } from './components';
export type { TrackApplicationViewProps } from './components';
export declare function plugin(initializerContext: PluginInitializerContext): UsageCollectionPlugin;
