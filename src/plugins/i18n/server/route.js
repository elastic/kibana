import Boom from 'boom';

var i18n = require('./i18n');
var langParser = require('accept-language-parser');

const DEFAULT_LANGUAGE = 'en';

export default function (server) {

  server.route({
    path: '/api/i18n/translations/{plugin}',
    method: 'GET',
    handler(req, reply) {
      var pluginName = req.params.plugin;
      var acceptLanguage = req.headers['accept-language'];
      var languages = langParser.parse(acceptLanguage);

      getPluginLanguageTranslations(pluginName, languages, function (err, translations) {
        if (err) {
          reply(Boom.internal(err));
        }
        reply(translations);
      });
    }
  });

};

function getPluginLanguageTranslations(pluginName, acceptLanguages, cb) {

  getPluginSupportedLanguage(pluginName, acceptLanguages, function (err, language) {
    if (err) {
      return cb (err);
    }

    if (!language) {
      language = DEFAULT_LANGUAGE;
    }

    i18n.getRegisteredPluginLanguageTranslations(pluginName, language, function (err, translationJson) {
      if (err) {
        return cb (err);
      } else {
        return cb (null, translationJson);
      }
    });
  });
}

function getPluginSupportedLanguage(pluginName, acceptLanguages, cb) {
  i18n.getRegisteredPluginLanguages(pluginName, function (err, languages) {
    if (err) {
      return cb (err);
    }

    //TODO: Algorithm which returns a languages based on the accept languages
    //from the client and languages supported by the plugin
    return cb (null, null);
  });

}
