import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface DeprecationsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeprecationsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
