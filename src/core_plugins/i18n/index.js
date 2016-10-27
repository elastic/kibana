import * as i18n from './server/i18n/i18n';

export default function (kibana) {
  return new kibana.Plugin({
    id: 'i18n',
    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        locale: Joi.string().default('en')
      }).default();
    },

    init(server, options) {
      server.expose('getTranslationsForLocale', i18n.getTranslationsForLocale);
      server.expose('getTranslationsForDefaultLocale', i18n.getTranslationsForDefaultLocale);
      server.expose('getTranslationsForLocales', i18n.getTranslationsForLocales);
      server.expose('getRegisteredTranslationLocales', i18n.getRegisteredTranslationLocales);
      server.expose('registerTranslations', i18n.registerTranslations);
    }
  });
};
