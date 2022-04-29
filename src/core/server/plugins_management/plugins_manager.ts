import type {
  PluginDescriptor,
  AllowedPluginSource,
} from './types';

export class PluginsManager {
  private pluginDescriptors: PluginDescriptor[];
  constructor() {
    this.pluginDescriptors = [];
  }

  registerPlugins = () => {
    this.pluginDescriptors.push();
  }

  getPluginDescriptors = (): PluginDescriptor[] => {
    return this.pluginDescriptors;
  }

  getAllowedPluginSources = async (): Promise<AllowedPluginSource[]> => {
    return [
      {
        displayName: 'Verified',
        name: 'verified',
      },
      {
        displayName: 'External',
        name: 'external',
      },
    ]
  }
}