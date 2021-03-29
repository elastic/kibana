import type { PluginConfigDescriptor, PluginInitializerContext } from 'kibana/server';
import { EventBasedTelemetryPlugin } from './plugin';
import type { EventBasedTelemetryExampleConfigType } from './config';
import { configSchema } from './config';

export const config: PluginConfigDescriptor<EventBasedTelemetryExampleConfigType> = {
  schema: configSchema,
};

export function plugin(initializerContext: PluginInitializerContext) {
  return new EventBasedTelemetryPlugin(initializerContext);
}

export type { EventBasedTelemetryPluginSetup, EventBasedTelemetryPluginStart } from './types';
