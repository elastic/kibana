import { resolve } from 'path';

export function parse(command, options) {
  const settings = {
    quiet: options.quiet || false,
    silent: options.silent || false,
    config: options.config || '',
    pluginDir: options.pluginDir || '',
    plugin: command
  };

  settings.pluginPath = resolve(settings.pluginDir, settings.plugin);

  return settings;
}
