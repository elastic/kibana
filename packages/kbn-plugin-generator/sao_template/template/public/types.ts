import { NavigationPublicPluginStart } from '<%= relRoot %>/src/plugins/navigation/public';

export interface <%= upperCamelCaseName %>PluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface <%= upperCamelCaseName %>PluginStart {}

export interface AppPluginDependencies { 
  navigation: NavigationPublicPluginStart 
};
