import expiry from 'expiry-js';
import { resolve } from 'path';

function generateUrls({ version, plugin }) {
  return [
    plugin,
    `https://artifacts.elastic.co/downloads/kibana-plugins/${plugin}/${plugin}-${version}.zip`
  ];
}

export function parseMilliseconds(val) {
  let result;

  try {
    const timeVal = expiry(val);
    result = timeVal.asMilliseconds();
  } catch (ex) {
    result = 0;
  }

  return result;
}

export function parse(command, options, kbnPackage) {
  const settings = {
    timeout: options.timeout || 0,
    quiet: options.quiet || false,
    silent: options.silent || false,
    config: options.config || '',
    plugin: command,
    version: kbnPackage.version,
    pluginDir: options.pluginDir || ''
  };

  settings.urls = generateUrls(settings);
  settings.workingPath = resolve(settings.pluginDir, '.plugin.installing');
  settings.tempArchiveFile = resolve(settings.workingPath, 'archive.part');
  settings.tempPackageFile = resolve(settings.workingPath, 'package.json');
  settings.setPlugin = function (plugin) {
    settings.plugin = plugin;
    settings.pluginPath = resolve(settings.pluginDir, settings.plugin.name);
  };

  return settings;
}
