import  i18n from './i18n';

/*
 Manages the locale translations for Kibana. Responsible for loading translated content per locale.

API:

Register translations:
  registerTranslations(<absolute_path_to_translation_file>)
  The translation file is registered with i18n plugin. The plugin contains a list of registered translation file paths per language.

Fetch the list of currently supported locales:
  List getRegisteredTranslationLocales()
  Returns a list of all locales as locale codes for which translations are registered

Fetch a specific locale translated content bundle:
  Promise getRegisteredLocaleTranslations(<locale_code>)
  Returns a Promise object which will contain on resolve a JSON object of all registered translations for the locale code specified
*/

let registerTranslations = function (absolutePluginTranslationFilePath) {
  return i18n.registerTranslations(absolutePluginTranslationFilePath);
};

let getRegisteredLocaleTranslations = function (locale) {
  return i18n.getRegisteredLocaleTranslations(locale);
};

let getRegisteredTranslationLocales = function () {
  return i18n.getRegisteredTranslationLocales();
};

module.exports.registerTranslations = registerTranslations;
module.exports.getRegisteredLocaleTranslations = getRegisteredLocaleTranslations;
module.exports.getRegisteredTranslationLocales = getRegisteredTranslationLocales;
