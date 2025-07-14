import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface WorkflowsPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface WorkflowsPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
