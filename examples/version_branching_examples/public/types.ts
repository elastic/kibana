import { NavigationPublicPluginStart } from '../../../src/plugins/navigation/public';

export interface VersionBranchingExamplesPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface VersionBranchingExamplesPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
