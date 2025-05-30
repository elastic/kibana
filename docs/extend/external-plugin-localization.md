---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/external-plugin-localization.html
---

# Localization for plugins outside the Kibana repo [external-plugin-localization]

To introduce localization for your plugin, use our i18n tool to create IDs and default messages. You can then extract these IDs with respective default messages into localization JSON files for {{kib}} to use when running your plugin.


## Adding localization to your plugin [_adding_localization_to_your_plugin]

You must add a `translations` directory at the root of your plugin. This directory will contain the translation files that {{kib}} uses.

```shell
.
├── translations
│   ├── en.json
│   ├── ja-JP.json
│   └── zh-CN.json
└── .i18nrc.json
```


## Using {{kib}} i18n tooling [_using_kib_i18n_tooling]

To simplify the localization process, {{kib}} provides tools for the following functions:

* Verify all translations have translatable strings and extract default messages from templates
* Verify translation files and integrate them into {{kib}}

To use {{kib}} i18n tooling, create a `.i18nrc.json` file with the following configs:

* `paths`.  The directory from which the i18n translation IDs are extracted.
* `exclude`. The list of files to exclude while parsing paths.
* `translations`. The list of translations where JSON localizations are found.

```json
{
  "paths": {
    "myPlugin": "src/ui",
  },
  "exclude": [
  ],
  "translations": [
    "translations/zh-CN.json",
    "translations/ja-JP.json"
  ]
}
```

An example {{kib}} `.i18nrc.json` is [here](https://github.com/elastic/kibana/blob/current/.i18nrc.json).

Full documentation about i18n tooling is [here](https://github.com/elastic/kibana/blob/current/src/dev/i18n/README.md).


## Extracting default messages [_extracting_default_messages]

To extract the default messages from your plugin, run the following command:

```shell
node scripts/i18n_extract --output-dir ./translations --include-config ../kibana-extra/myPlugin/.i18nrc.json
```

This outputs a `en.json` file inside the `translations` directory. To localize other languages, clone the file and translate each string.


## Checking i18n messages [_checking_i18n_messages]

Checking i18n does the following:

* Checks all existing labels for violations.
* Takes translations from `.i18nrc.json` and compares them to the messages extracted and validated.

    * Checks for unused translations. If you remove a label that has a corresponding translation, you must also remove the label from the translations file.
    * Checks for incompatible translations.  If you add or remove a new parameter from an existing string, you must also remove the label from the translations file.


To check your i18n translations, run the following command:

```shell
node scripts/i18n_check --fix --include-config ../kibana-extra/myPlugin/.i18nrc.json
```


## Implementing i18n in the UI [_implementing_i18n_in_the_ui]

{{kib}} relies on ReactJS and requires localization in different environments (browser and NodeJS). The internationalization engine is framework agnostic and consumable in all parts of {{kib}} (ReactJS, and NodeJS).

To simplify internationalization in React, an additional abstraction is built around the I18n engine using [React-intl](https://github.com/yahoo/react-intl) for React.


### i18n for vanilla JavaScript [_i18n_for_vanilla_javascript]

```js
import { i18n } from '@kbn/i18n';

export const HELLO_WORLD = i18n.translate('hello.wonderful.world', {
  defaultMessage: 'Greetings, planet Earth!',
});
```

Full details are [here](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-i18n#vanilla-js).


### i18n for React [_i18n_for_react]

To localize strings in React, use either `FormattedMessage` or `i18n.translate`.

```js
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const Component = () => {
  return (
    <div>
      {i18n.translate('xpack.someText', { defaultMessage: 'Some text' })}
      <FormattedMessage id="xpack.someOtherText" defaultMessage="Some other text">
      </FormattedMessage>
    </div>
  );
};
```

Full details are [here](https://github.com/elastic/kibana/tree/main/src/platform/packages/shared/kbn-i18n#react).


## Resources [_resources]

To learn more about i18n tooling, see [i18n dev tooling](https://github.com/elastic/kibana/blob/master/src/dev/i18n/README.md).

To learn more about implementing i18n in the UI, use the following links:

* [i18n plugin](https://github.com/elastic/kibana/blob/master/src/platform/packages/shared/kbn-i18n/README.md)
* [i18n guidelines](https://github.com/elastic/kibana/blob/master/src/platform/packages/shared/kbn-i18n/GUIDELINE.md)

