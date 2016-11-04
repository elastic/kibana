import { resolve } from 'path';

export function parse(command) {
  const settings = {
    pluginDir: command.pluginDir || ''
  };

  return settings;
}
