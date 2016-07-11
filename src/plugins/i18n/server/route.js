import Boom from 'boom';

var i18n = require('./i18n/index');
var langParser = require('accept-language-parser');

const DEFAULT_LANGUAGE = 'en';

export default function (server) {

  server.route({
    path: '/api/i18n/translations',
    method: 'GET',
    handler(req, reply) {
      var acceptLanguage = req.headers['accept-language'];
      var languages = langParser.parse(acceptLanguage);

      getRegisteredLanguageTranslations(languages, function (err, translations) {
        if (err) {
          reply(Boom.internal(err));
          return;
        }
        reply(translations);
      });
    }
  });

};

function getRegisteredLanguageTranslations(acceptLanguages, cb) {

  getRegisteredTranslationLanguages(acceptLanguages, function (err, language) {
    if (err) {
      return cb(err);
    }

    i18n.getRegisteredLanguageTranslations(language, function (err, translationsJson) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, translationsJson);
      }
    });
  });
}

function getRegisteredTranslationLanguages(acceptLanguages, cb) {
  var langStr = DEFAULT_LANGUAGE;

  i18n.getRegisteredTranslationLanguages(function (err, registeredLanguages) {
    if (err) {
      return cb(err);
    }

    var foundLang = false;
    var langStr = '';
    acceptLanguages.some(function exactMatch(language) {
      if (language.region) {
        langStr = language.code + '-' + language.region;
      } else {
        langStr = language.code;
      }
      if (registeredLanguages.indexOf(langStr) > -1) {
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
      registeredLanguages.some(function (lang) {
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
