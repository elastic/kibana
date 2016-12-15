# management-es

A Kibana translation plugin structure. 

The main goal is to keep the plugin extremely simple so non-technical translators will have no trouble
creating new translations for Kibana. Everything except for the translations themselves can be generated
automatically with some enhancements to the Kibana plugin generator. The generator would only need a
plugin name and a list of one or more languages the user wants to create translations for.

The default plugin init function will register all translation files in the plugin's root level i18n directory.
For more advanced plugins that might have a different directory structure, this default is configurable by modifying
the init function.

Translation files are broken up by language and must have names that match IETF BCP 47 language codes.
Each translation file contains a single flat object with translation strings matched to their unique keys. Keys are
prefixed with plugin names and a dash to ensure uniqueness between plugins. A translation plugin is not restricted to 
providing translations only for itself, the provided translations can cover other plugins as well.
For example, this plugin shows how a third party plugin might provide spanish translations for the Kibana core "management"
app, which is itself a separate plugin.
