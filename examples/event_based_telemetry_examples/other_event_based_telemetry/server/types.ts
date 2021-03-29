import type {
  TelemetryPluginSetup,
  TelemetryPluginStart,
} from '../../../src/plugins/telemetry/server';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventBasedTelemetryPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventBasedTelemetryPluginStart {}

export interface EventBasedTelemetryPluginDepsSetup {
  telemetry?: TelemetryPluginSetup;
}

export interface EventBasedTelemetryPluginDepsStart {
  telemetry?: TelemetryPluginStart;
}
