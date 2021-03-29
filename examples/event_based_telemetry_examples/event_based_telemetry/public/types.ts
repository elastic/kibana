import { NavigationPublicPluginStart } from '../../../../src/plugins/navigation/public';

export interface EventBasedTelemetryPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface EventBasedTelemetryPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
