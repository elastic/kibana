import { resolve } from 'path';

export const PLUGINS_DIR = resolve(__dirname, 'plugins');

export const PluginsDirStringSerializer = {
  test: (v) => typeof v === 'string' && v.includes(PLUGINS_DIR),
  print: (v, serialize) => serialize(v.split(PLUGINS_DIR).join('<PLUGINS>')),
};

export const PluginsDirErrorSerializer = {
  test: (v) => v && v && typeof v.message === 'string' && v.message.includes(PLUGINS_DIR),
  print: (error, serialize) => {
    error.message = error.message.split(PLUGINS_DIR).join('<PLUGINS>');
    return serialize(error);
  },
};
