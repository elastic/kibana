import expiry from 'expiry-js';
import { intersection } from 'lodash';
import { resolve } from 'path';
import { arch, platform } from 'os';

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
};

export function parseProxy(val) {
  const result = val.trim();
  const regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
  if (!regexp.test(result)) {
    throw new Error(`Invalid proxy name ${result}`);
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
    pluginDir: options.pluginDir || '',
    proxy: options.proxy || ''
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
};
