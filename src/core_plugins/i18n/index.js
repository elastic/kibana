import i18n from './server/i18n/i18n';

export default function (kibana) {
  return new kibana.Plugin({
    init(server, options) {
      server.expose('getRegisteredLocaleTranslations', i18n.getRegisteredLocaleTranslations);
      server.expose('getRegisteredTranslationLocales', i18n.getRegisteredTranslationLocales);
      server.expose('registerTranslations', i18n.registerTranslations);
    }
  });
};
