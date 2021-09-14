import { NavigationPublicPluginStart } from '../../navigation/public';

export interface CustomIntegrationsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomIntegrationsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
