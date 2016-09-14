import i18n from '../../../../core_plugins/i18n/server/i18n/i18n';

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
      server.expose('getRegisteredLocaleTranslations', i18n.getRegisteredLocaleTranslations);
      server.expose('getRegisteredTranslationLocales', i18n.getRegisteredTranslationLocales);
      server.expose('registerTranslations', i18n.registerTranslations);
    }
  });
};
