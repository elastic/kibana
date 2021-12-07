import { PluginSetup, PluginStart } from '../../data/server';

export interface ProfilingPluginSetupDeps {
  data: PluginSetup;
}

export interface ProfilingPluginStartDeps {
  data: PluginStart;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginSetup {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ProfilingPluginStart {}
