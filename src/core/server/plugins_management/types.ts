
export interface PluginDescriptor {
  pluginName: string;
  source: 'external' | 'verified';
  version: string;
}

export interface AllowedPluginSource {
  name: string;
  displayName: string;
}