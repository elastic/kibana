
export interface PluginDescriptor {
  pluginName: string;
  source: 'external' | 'verified';
  version: string;
  // new version is available (8.3.1)
  upgradeTarget?: string;
}

export interface AllowedPluginSource {
  name: string;
  displayName: string;
}