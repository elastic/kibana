import { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface VisualizeListingPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VisualizeListingPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
