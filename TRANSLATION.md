Translating Kibana
===

Background
---

Please see [kibana#6515](https://github.com/elastic/kibana/issues/6515)
for background discussion on the Kibana translation work.

Prerequisites
---

Kibana must be installed and operational, see README.md

Audience
---

There are three audiences for this document:
- those that want to contribute translations to Kibana
- those that want to enable translation of Kibana
- those that want to create a Kibana Plugin

Contributing Translations
---

For this example, we will demonstrate translation into Maltese (Language code `mt`).

- Fork the `kibana` source, and ensure you have an up to date copy of the source.
- Ensure you have signed the agreement as in CONTRIBUTING.md
- Choose the right [bcp47]() language code for your work.
In this example, we will use the `kibana` plugin for translating and `mt` for Maltese. Other examples
might be `zh-Hans` for Chinese using Simplified characters, or
`az-Cyrl` for Azerbaijani using Cyrillic characters.
The following links can help:
  - [List of ISO 639-1 codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
  - [“Picking the right language code”](http://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code)
- Create a new branch for your work:

    git checkout -b translate-mt

- For each translation scope 
(see [Scoping Translations](#Scoping Translations), below), 
copy the translation plugin template directory `translation_plugin_template` to `<kibana_root>/plugins` changing the directory name to _plugin_-_languagecode_:

    cp -r src/fixtures/translation_plugin_template src/plugins; mv src/plugins/translation_plugin_template src/plugins/kibana-mt
    …
    
- Replace the the `en.json` English source with _languagecode_`.json`:
    mv src/plugins/kibana-mt/translations/en.json src/plugins/kibana-mt/translations/mt.json 

- Translate the `mt.json` file in a JSON editor 

- Edit index file (`src/plugins/kibana-mt/index.js`), updating the 'translations' item as per your plugin translation(s) and changing plugin id to you plugin name (`kibana-mt`)

- Edit package file (`src/plugins/kibana-mt/package`), updating the 'name' field to your plugin name (`kibana-mt`)

- See `src/fixtures/translation_plugin_template/README.mt` for more details

- Start up Kibana and verify the translation works as expected.

- Ensure Kibana tests pass

- Commit the `kibana-mt` directory and files, and push them to your own
fork of `kibana`

- Open a pull request titled `Translation: Maltese (mt)`


Scoping Translations
---
Kibana translates according to plugin scope, so there is
a `.json` file in `translations` subdirectory
for each plugin.

Enabling Translation of an Angular view
---

* Determine which views share a plugin scope.
In this example, `create` and `edit` will share scope.

* If it does not already exist, Create the appropriate `translation` directory and the new translation file `en.json` inside it.
In the above example, it would be:
`src/core_plugins/kibana/translations/en.json`

* In the view (HTML) file, such as
`src/core_plugins/kibana/public/management/sections/indices/_create.html`
Replace English text with translation keys, and copy the English text
into the `en.json` file appropriately.
Note that loose text was put into a `<p></p>` tag for translation purposes.
Also note the prefix `KIBANA-` matching the plugin being translated.

#### Before ####
`_create.html`
```
    <h1>Configure an index pattern</h1>
    In order to use Kibana you must configure at least one index pattern…
```

#### After ####
`_create.html`
```
    <h1 translate>KIBANA-H1_CONFIGURE_INDEX_PATTERN</h1>
    <p translate>KIBANA-MUST_CONFIGURE_INDEX_PATTERN</p>
```

`en.json`
```
    {
       "KIBANA-H1_CONFIGURE_INDEX_PATTERN": "Configure an index pattern",
       "KIBANA-MUST_CONFIGURE_INDEX_PATTERN": "In order to use Kibana you must…"
    }
```

* Refresh the Kibana page and verify the UI looks the same.

* Refer to Kibana core plugin (`src/core_plugins/kibana/`) for examples.

Plugin Authors
---

Add-on functionality for Kibana is implemented with plug-in modules. Refer to [Kibana Plugins](https://www.elastic.co/guide/en/kibana/current/kibana-plugins.html) for more details. It is recommended that when creating a plugin you enable translations (see [Scoping Translations](#Scoping Translations), above).

Enabling Translation in a Plugin
---

* If the plugin does not exist already, create the plugin.
In this example, `plugin1`

* Create the appropriate `translation` directory and the new translation file `en.json` inside it.
In the above example, it would be:
   `src/plugins/plugin1/translations/en.json`

* A plugin publishes its translation file(s) via `uiExports` by adding the `translations` key and listing the path(s) to the translation file(s) in the plugin creation code (`return new kibana.Plugin`) as follows:
`uiExports: {
  translations: [
    resolve(__dirname, './translations/en.json')
  ]
}`

* Refer to [Scoping Translations](#Scoping Translations) for more details on enabling translation in your plugin views and refer to Kibana core plugin (`src/core_plugins/kibana/`) for an example.
