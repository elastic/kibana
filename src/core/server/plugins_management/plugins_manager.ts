import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { REPO_ROOT } from '@kbn/utils';
import type { PluginDescriptor, AllowedPluginSource } from './types';

export class PluginsManager {
  private pluginDescriptors: PluginDescriptor[];
  constructor() {
    this.pluginDescriptors = [
      {
        pluginName: 'Console',
        source: 'verified',
        version: '8.3.0',
        upgradeAvailable: true,
      },
      {
        pluginName: 'Home',
        source: 'verified',
        version: '8.3.0',
        upgradeAvailable: false,
      },
    ];
  }

  registerPlugins = () => {
    this.pluginDescriptors.push();
  };

  private async linkConsolePublic(p: string) {
    /*
     PUBLIC UPGRADE HACK
     This should probably be more like:

     1. Either have downloaded or download upgrade now
     2. Ensure that network requests are paused for the plugin
     3. Maybe broadcast upgrade event?
     4. Switch the public assets
     5. Done!
     */
    const liveDir = path.resolve(REPO_ROOT, 'src/plugins/console/public');
    console.log('delete live public files...');
    await fs.rm(liveDir, { force: true, recursive: true });
    console.log('successfully deleted.');
    const pathToCopy = path.resolve(REPO_ROOT, p);
    console.log(`copying: ${pathToCopy} -> ${liveDir}...`);
    await fs.cp(pathToCopy, liveDir, { force: true, recursive: true });
    console.log('sucessfully copied.');
  }

  resetConsole = async () => {
    // Put the original console code back
    await this.linkConsolePublic('src/AAA_temp/public');
  };

  upgrade = async () => {
    await this.linkConsolePublic('src/AAA_temp/public_8_3_0');
    this.pluginDescriptors = this.pluginDescriptors.map((desc) => {
      return { ...desc, upgradeAvailable: false };
    });

    // TODO: Server side upgrade
  };;

  getPluginDescriptors = (): PluginDescriptor[] => {
    return this.pluginDescriptors;
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
