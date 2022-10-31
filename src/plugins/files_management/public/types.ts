import { NavigationPublicPluginStart } from '../../navigation/public';

export interface FilesManagementPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FilesManagementPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}
