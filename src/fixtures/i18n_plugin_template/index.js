import { resolve } from 'path';

export default function (kibana) {
  return new kibana.Plugin({
    require: ['i18n'],

    init(server, options) {
      server.plugins.i18n.registerTranslations(resolve(__dirname, 'i18n'));
    }
  });
};
