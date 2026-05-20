import type { PluginInitializerContext } from '@kbn/core/public';
import { InspectorPublicPlugin } from './plugin';
export declare function plugin(initializerContext: PluginInitializerContext): InspectorPublicPlugin;
export { type Adapters, type Request, type RequestStatistic, type RequestStatistics, RequestAdapter, RequestStatus, RequestResponder, } from '../common';
export { apiHasInspectorAdapters, type HasInspectorAdapters, } from './adapters/has_inspector_adapters';
export { InspectorPublicPlugin as Plugin } from './plugin';
export type { Setup, Start } from './plugin';
export type { InspectorViewProps, InspectorViewDescription, InspectorOptions, InspectorSession, } from './types';
