import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface SearchUxSandboxPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchUxSandboxPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
