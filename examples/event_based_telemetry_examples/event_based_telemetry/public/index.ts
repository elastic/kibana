import { EventBasedTelemetryPlugin } from './plugin';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new EventBasedTelemetryPlugin();
}
export type { EventBasedTelemetryPluginSetup, EventBasedTelemetryPluginStart } from './types';
