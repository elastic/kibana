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
          return;
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

    var foundLang = false;
    var langStr = '';
    acceptLanguages.some(function exactMatch(language) {
      if (language.region) {
        langStr = language.code + '-' + language.region;
      } else {
        langStr = language.code;
      }
      if (languages.indexOf(langStr) > -1) {
        foundLang = true;
        return true;
      } else {
        return false;
      }
    });
    if (foundLang) {
      return cb (null, langStr);
    }

    acceptLanguages.some(function partialMatch(language) {
      langStr = language.code;
      languages.some(function (lang) {
        if (lang.match('^' + langStr)) {
          langStr = lang;
          foundLang = true;
          return true;
        } else {
          return false;
        }
      });
      if (foundLang) {
        return true;
      } else {
        return false;
      }
    });

    if (foundLang) {
      return cb (null, langStr);
    }

    return cb (null, DEFAULT_LANGUAGE);
  });

}
