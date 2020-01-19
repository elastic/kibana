
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '<%= relRoot %>/src/core/server';

export interface <%= camelCaseName %>PluginSetup {};
export interface <%= camelCaseName %>PluginStart {};

export class <%= camelCaseName %>ServerPlugin implements Plugin<<%= camelCaseName %>PluginSetup, <%= camelCaseName %>PluginStart> {
  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}

export { <%= camelCaseName %>ServerPlugin as Plugin };