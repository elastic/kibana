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

There are two audiences for this document:
- those that want to contribute translations to Kibana
- those that want to enable translation of Kibana

Contributing Translations
---

For this example, we will demonstrate translation into Maltese (Language code `mt`).

- Fork the `kibana` source, and ensure you have an up to date copy of the source.
- Ensure you have signed the agreement as in CONTRIBUTING.md
- Choose the right [bcp47]() language code for your work.
In this example, we will use `mt` for Maltese. Other examples
might be `zh-Hans` for Chinese using Simplified characters, or
`az-Cyrl` for Azerbaijani using Cyrillic characters.
The following links can help:
  - [List of ISO 639-1 codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
  - [“Picking the right language code”](http://cldr.unicode.org/index/cldr-spec/picking-the-right-language-code)
- Create a new branch for your work:

    git checkout -b translate-mt

- For each translation scope 
(see [Scoping Translations](#Scoping Translations), below), 
copy the `en.json` English source to _languagecode_`.json`:

    cp src/plugins/kibana/public/settings/sections/indices/i18n/en.json src/plugins/kibana/public/settings/sections/indices/i18n/mt.json
    …
    
- Translate each `mt.json` file in a JSON editor 

- Start up Kibana and verify the translation works as expected.

- Ensure Kibana tests pass

- Commit the `mt.json` files and push them to your own
fork of `kibana`

- Open a pull request titled `Translation: Maltese (mt)`


Scoping Translations
---
Kibana translates according to app scope, so there are
different `.json` files in a different `i18n` subdirectory
 according to scope. Within each `.json` file,
for example 
`src/plugins/kibana/public/settings/sections/indices/i18n/en.json`
there are multiple sections, such as `create` and `edit`.


Enabling Translation of an Angular view
---

* Determine which views should share an application scope.
In this example, `create` and `edit` will share scope.

* Create the actual translation file.

 * Create the appropriate `i18n` directory and the new file `en.json` inside it.
In the above example, it would be:
`src/plugins/kibana/public/settings/sections/indices/i18n/en.json`

 * Structure the file so that it has a top-level key for each view
(i.e. `create` and `edit` in our example).

```
    {
      "create": {
      },
      "edit": {          
      }
    }
```

* In the controller file, such as 
`src/plugins/kibana/public/settings/sections/indices/_create.js`
add `$translate, $translatePartialLoader` to the injected parameters of
the call to `.controller()`.   Add to that function these calls:

```!js
  // point angular-translate to base subdirectory where this modules i18n files are located
  $translatePartialLoader.addPart('../plugins/kibana/settings/sections/indices');
  $translate.refresh();
```

* In the matching view (HTML) file, such as
`src/plugins/kibana/public/settings/sections/indices/_create.html`
Replace English text with translation keys, and copy the English text
into the `en.json` file appropriately.
Note that loose text was put into a `<p></p>` tag for translation purposes.
Also note the prefix `create.` matching the view and controller source files.

#### Before ####
`_create.html`
```
    <h1>Configure an index pattern</h1>
    In order to use Kibana you must configure at least one index pattern…
```

#### After ####
`_create.html`
```
    <h1 translate>create.H1_CONFIGURE_INDEX_PATTERN</h1>
    <p translate>create.MUST_CONFIGURE_INDEX_PATTERN</p>
```

`en.json`
```
    {
        "create": {
            "H1_CONFIGURE_INDEX_PATTERN": "Configure an index pattern",
            "MUST_CONFIGURE_INDEX_PATTERN": "In order to use Kibana you must…"
        },
        "edit": {
            …
        }
    }
```

* Refresh the Kibana page and verify the UI looks the same.
