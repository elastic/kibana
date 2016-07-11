import { i18n } from './i18n';

let registerTranslations = function (pluginTranslationPath, cb) {
  i18n.registerTranslations(pluginTranslationPath, cb);
};

let getRegisteredLanguageTranslations = function (language, cb) {
  i18n.getRegisteredLanguageTranslations(language, cb);
};

let getRegisteredTranslationLanguages = function (cb) {
  i18n.getRegisteredTranslationLanguages(cb);
};

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
