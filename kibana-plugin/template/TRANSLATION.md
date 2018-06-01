A Kibana translation plugin structure.

The main goal is to keep the plugin extremely simple so non-technical translators will have no trouble
creating new translations for Kibana. Everything except for the translations themselves can be generated
automatically with some enhancements to the Kibana plugin generator. The generator would only need a
plugin name and a list of one or more languages the user wants to create translations for.

The plugin exports its translation file(s) on the server when it it starts up. This is achieved by publishing the files
via 'uiExports'.This is configurable by modifying the 'translations' item in the 'uiExports'.

Translation files are broken up by language and must have names that match IETF BCP 47 language codes.
Each translation file contains a single flat object with translation strings matched to their unique keys. Keys are
prefixed with plugin names and a dash to ensure uniqueness between plugins. A translation plugin is not restricted to
providing translations only for itself, the provided translations can cover other plugins as well.

For example, this template plugin shows how a third party plugin might provide Spanish translations for the Kibana core "kibana" app, which is itself a separate plugin.

To create a translation plugin using this template, follow these steps:
  1. Generate the plugin using the generator
  2. Add your translations files to <plugin_name>/translations directory. Remove/Overwrite the existing translation file (i.e. 'es.json').
  3. Edit <plugin_name>/index.js, updating the 'translations' item as per your plugin translations.
  4. Restart the Kibana server to publish your plugin translations.
