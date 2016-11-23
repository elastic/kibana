import * as i18n from './server/i18n';

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
      const defaultLocale = server.config.locale;
      i18n.setDefaultLocale(defaultLocale);

      server.expose('getTranslations', i18n.getTranslations);
      server.expose('getTranslationsForDefaultLocale', i18n.getTranslationsForDefaultLocale);
      server.expose('getRegisteredTranslationLocales', i18n.getRegisteredTranslationLocales);
      server.expose('registerTranslations', i18n.registerTranslations);
    }
  });
};
