import  i18n from './i18n';

/*
 Manages the language translations for Kibana. Responsible for loading translated content per language.

API:

Register translations:
  registerTranslations(<absolute_path_to_translation_file>)
  The translation file will be bundled into one translation file per language and stored in the Kibana data directory. Returns a Promise object.

Fetch the list of currently supported languages:
  Promise getRegisteredTranslationLanguages()
  Returns a Promise object which will contain on resolve a list of all languages as language codes for which translations are registered

Fetch a specific language translated content bundle:
  Promise getRegisteredLanguageTranslations(<language_code>)
  Returns a Promise object which will contain on resolve a JSON object of all registered translations for the language code specified
*/

let registerTranslations = function (absolutePluginTranslationFilePath) {
  return i18n.registerTranslations(absolutePluginTranslationFilePath);
};

let getRegisteredLanguageTranslations = function (language) {
  return i18n.getRegisteredLanguageTranslations(language);
};

let getRegisteredTranslationLanguages = function () {
  return i18n.getRegisteredTranslationLanguages();
};

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLanguageTranslations = getRegisteredLanguageTranslations;
module.exports.getRegisteredTranslationLanguages = getRegisteredTranslationLanguages;
