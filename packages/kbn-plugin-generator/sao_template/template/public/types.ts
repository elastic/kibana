import { NavigationPublicPluginStart } from '<%= relRoot %>/src/plugins/navigation/public';

export interface <%= upperCamelCaseName %>PublicPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface <%= upperCamelCaseName %>PublicPluginStart {}

export interface AppPluginDependencies { 
  navigation: NavigationPublicPluginStart 
};
