# i18n

> Core plugin which manages Kibana globalization

---

The main goal is to manage translations for all views in Kibana. 

The i18n plugin provides an API for plugins to register translations. This API takes top level directory of where the plugin translations reside and then concatenates thes translations into a translation bundle per language. The translation files need to be a valid JSON object of key, value elements. The IDs need to be unique so it is recommended to use plugin name as a prefix.

The i18n plugin provides an additional API to get registered translations for a language.  This return a JSON object of all the translations elements iregistered for that language.
