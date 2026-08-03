import type { PluginInitializerContext } from '@kbn/core/public';
import type { TelemetryPluginConfig } from './plugin';
import { TelemetryPlugin } from './plugin';
export type { TelemetryConstants, TelemetryPluginStart, TelemetryPluginSetup, TelemetryPluginConfig, TelemetryServicePublicApis, } from './plugin';
export declare function plugin(initializerContext: PluginInitializerContext<TelemetryPluginConfig>): TelemetryPlugin;
