import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import type { PluginDescriptor, AllowedPluginSource } from './types';
import type { PluginsService } from '../plugins';

export class PluginsManager {
  private pluginDescriptors: Map<string, PluginDescriptor>;
  private plugins: PluginsService;
  private coreSetup: any;
  private httpSetup: any;

  constructor(plugins: PluginsService, httpSetup: any, coreSetup: any) {
    this.plugins = plugins;
    this.coreSetup = coreSetup;
    this.httpSetup = httpSetup;
    this.pluginDescriptors = new Map();
    this.pluginDescriptors.set('console', {
      pluginName: 'Console',
      source: 'verified',
      version: '8.3.0',
      upgradeAvailable: true,
    });
    this.pluginDescriptors.set('home', {
      pluginName: 'Home',
      source: 'verified',
      version: '8.3.0',
      upgradeAvailable: false,
    });
  }

  upgrade = async () => {
    this.pluginDescriptors.set('console', {
      ...this.pluginDescriptors.get('console')!,
      upgradeAvailable: false,
      version: '8.3.1',
    });
    const descriptor = this.pluginDescriptors.get('console');

    // TODO: Server side upgrade
    await this.plugins.reloadPlugin('console', { coreSetup: this.coreSetup, descriptor })
    await this.httpSetup.reloadRoutes()
  };

  getPluginDescriptors = (): PluginDescriptor[] => {
    return [...this.pluginDescriptors.values()];
  };

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
    ];
  };
}
