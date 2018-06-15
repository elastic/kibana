# I18n

Kibana relies on several UI frameworks (React and Angular) and
requires localization in different environments (browser and NodeJS).
Internationalization engine is framework agnostic and consumable in
all parts of Kibana (React, Angular and NodeJS). In order to simplify
internationalization in UI frameworks, the additional abstractions are
built around the I18n engine: `react-intl` for React and custom
components for Angular. [React-intl](https://github.com/yahoo/react-intl)
is built around [intl-messageformat](https://github.com/yahoo/intl-messageformat),
so both React and Angular frameworks use the same engine and the same
message syntax.

## Localization files

Localization files have [JSON5](https://github.com/json5/json5) format.

The main benefits of using `JSON5`:

- Objects may have a single trailing comma.
- Single and multi-line comments are allowed.
- Strings may span multiple lines by escaping new line characters.

Short example:

```js
{
  // comments
  unquoted: 'and you can quote me on that',
  singleQuotes: 'I can use "double quotes" here',
  lineBreaks: "Wow! \
No \\n's!",
  hexadecimal: 0xdecaf,
  leadingDecimalPoint: .8675309, andTrailing: 8675309.,
  positiveSign: +1,
  trailingComma: 'in objects', andIn: ['arrays',],
  "backwardsCompatible": "with JSON",
}
```

Using comments can help to understand which section of the application
the localization key is used for. Also `namespaces`
are used in order to simplify message location search. For example, if
we are going to translate the title of `/management/sections/objects/_objects.html`
file, we should use message path like this: `'MANAGEMENT.OBJECTS.TITLE'`.

Each Kibana plugin has a separate folder with translation files located at
```
{path/to/plugin}/translations/{locale}.json
```

where `locale` is [ISO 639 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

For example:
```
src/core_plugins/kibana/translations/fr.json
```

When a new translation file is added, you have to register this file into
`uiExports.translations` array of plugin constructor parameters. For example:
```js
export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      translations: [
        resolve(__dirname, './translations/fr.json'),
      ],
      ...
    },
    ...
  });
}
```

The engine uses a locale resolution process similar to that of the built-in
Intl APIs to determine which locale data to use based on the `accept-language`
http header.

The following are the abstract steps i18n engine goes through to resolve the locale value:

- If there's data for the specified locale (localization file is registered in
  `uiExports.translations`), then that locale will be resolved.
- If locale data is missing for a leaf locale like `fr-FR`, but there is data
for one of its ancestors, `fr` in this case, then its ancestor will be used.
- If `accept-language` header is not presented or previous steps didn't resolve
the locale, the locale will be resolved to locale defined in `i18n.defaultLocale`
option at `config/kibana.yml` file.

One of our technical requirements is to have default message in the templates
themselves, and that message will always be english, so we don't need interact
with `en.json` file directly. We can generate that file from `defaultMessage`s
defined inline.

## I18n engine

I18n engine is the platform agnostic abstraction that helps to supply locale
data to UI frameworks and provides methods for the direct translation.

Here is the public API exposed by this engine:

- `addMessages(messages: Map<string, string>, [locale: string])` - provides a way to register
translations with the engine
- `getMessages()` - returns messages for the current language
- `setLocale(locale: string)` - tells the engine which language to use by given
language key
- `getLocale()` - returns the current locale
- `setDefaultLocale(locale: string)` - tells the library which language to fallback
when missing translations
- `getDefaultLocale()` - returns the default locale
- `setFormats(formats: object)` - supplies a set of options to the underlying formatter.
For the detailed explanation, see the section below
- `getFormats()` - returns current formats
- `getRegisteredLocales()` - returns array of locales having translations
- `translate(id: string, [{values: object, defaultMessage: string}])` – translate message by id
- `init(messages: Map<string, string>)` - initializes the engine

#### I18n engine internals

The engine uses the ICU Message syntax and works for all CLDR languages which
have pluralization rules defined. It's built around `intl-messageformat` package
which exposes `IntlMessageFormat` class. Messages are provided into the constructor
as a string message, or a pre-parsed AST object.

```js
import IntlMessageFormat from 'intl-messageformat';

const msg = new IntlMessageFormat(message, locales, [formats]);
```

The string `message` is parsed, then stored internally in a
compiled form that is optimized for the `format()` method to
produce the formatted string for displaying to the user.

```js
const output = msg.format(values);
```

`formats` parameter in `IntlMessageFormat` constructor allows formatting numbers
and dates/times in messages using `Intl.NumberFormat` and `Intl.DateTimeFormat`,
respectively.

```js
const msg = new IntlMessageFormat('The price is: {price, number, USD}', 'en-US', {
  number: {
    USD: {
      style   : 'currency',
      currency: 'USD',
    },
  },
});

const output = msg.format({ price: 100 });

console.log(output); // => "The price is: $100.00"
```

In this example, we're defining a USD number format style which is passed to
the underlying `Intl.NumberFormat` instance as its options.
[Here](https://github.com/yahoo/intl-messageformat/blob/master/src/core.js#L62)
you can find default format options used as the prototype of the formats
provided to the constructor.

Creating instances of `IntlMessageFormat` is expensive.
[Intl-format-cache](https://github.com/yahoo/intl-format-cache)
library is simply to make it easier to create a cache of format
instances of a particular type to aid in their reuse. Under the
hood, this package creates a cache key based on the arguments passed
to the memoized constructor.

```js
import memoizeIntlConstructor from 'intl-format-cache';

const getMessageFormat = memoizeIntlConstructor(IntlMessageFormat);
```

## React

[React-intl](https://github.com/yahoo/react-intl) library is used for internalization
React part of the application. It provides React components and an API to format
dates, numbers, and strings, including pluralization and handling translations.

React Intl uses the provider pattern to scope an i18n context to a tree of components.
`IntlProvider` component is used to setup the i18n context for a tree. After that we
are able to use `FormattedMessage` component in order to translate messages.
`IntlProvider` should wrap react app's root component (inside each react render method).

In order to translate messages we need to use custom `I18nProvider` component
that uses I18n engine under the hood:

```js
import React from 'react';
import ReactDOM from 'react-dom';
import { ReactI18n } from '@kbn/i18n';

const { I18nProvider } = ReactI18n;

ReactDOM.render(
  <I18nProvider>
    <RootComponent>
      ...
    </RootComponent>
  </I18nProvider>,
  document.getElementById('container')
);
```

After that we can use `FormattedMessage` components inside `RootComponent`:
```js
import React, { Component } from 'react';
import { ReactI18n } from '@kbn/i18n';

const { FormattedMessage } = ReactI18n;

class RootComponent extends Component {
  constructor(props) {
    super(props);

    this.state = {
      name: 'Eric',
      unreadCount: 1000,
    };
  }

  render() {
    const {
      name,
      unreadCount,
    } = this.state;

    return (
      <p>
        <FormattedMessage
          id="welcome"
          defaultMessage={`Hello {name}, you have {unreadCount, number} {unreadCount, plural,
            one {message}
            other {messages}
          }`}
          values={{name: <b>{name}</b>, unreadCount}}
        />
        ...
      </p>
    );
  }
}
```

## Angular

Angular wrapper has 4 entities: translation `provider`, `service`, `directive`
and `filter`. Both the directive and the filter use the translation `service`
with i18n engine under the hood.

The translation `provider` is used for `service` configuration and
has the following methods:
- `addMessages(messages: Map<string, string>, [locale: string])` - provides a way to register
translations with the library
- `setLocale(locale: string)` - tells the library which language to use by given
language key
- `getLocale()` - returns the current locale
- `setDefaultLocale(locale: string)` - tells the library which language to fallback
when missing translations
- `getDefaultLocale()` - returns the default locale
- `setFormats(formats: object)` - supplies a set of options to the underlying formatter
- `getFormats()` - returns current formats
- `getRegisteredLocales()` - returns array of locales having translations
- `init(messages: Map<string, string>)` - initializes the engine

The translation `service` provides only one method:
- `i18n(id: string, [{values: object, defaultMessage: string}])` – translate message by id

The translation `filter` is used for attributes translation and has
the following syntax:
```
{{'translationId' | i18n[:{ values: object, defaultMessage: string }]}}
```

Where:
- `translationId` - translation id to be translated
- `values` - values to pass into translation
- `defaultMessage` - will be used unless translation was successful (the final
  fallback in english, will be used for generating `en.json`)

The translation `directive` has the following syntax:
```html
<ANY
  i18n-id="{string}"
  [i18n-values="{object}"]
  [i18n-default-message="{string}"]
></ANY>
```

Where:
- `i18n-id` - translation id to be translated
- `i18n-values` - values to pass into translation
- `i18n-default-message` - will be used unless translation was successful

Angular `I18n` module is placed into `autoload` module, so it will be
loaded automatically. After that we can use i18n directive in Angular templates:
```html
<span
  i18n-id="welcome"
  i18n-default-message="Hello!"
></span>
```

## Node.JS

`Intl-messageformat` package assumes that the
[Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
global object exists in the runtime. `Intl` is present in all modern
browsers and Node.js 0.10+. In order to load i18n engine
in Node.js we should simply `import` this module (in Node.js, the
[data](https://github.com/yahoo/intl-messageformat/tree/master/dist/locale-data)
for all 200+ languages is loaded along with the library) and pass the translation
messages into the constructor:

```js
import { I18n } from '@kbn/i18n';

const i18n = new I18n(messages);
```

After that we are able to use all methods exposed by the i18n engine
(see [I18n engine](#i18n-engine) section above for more details).

## Build tools

In order to simplify localization process, some build tools will be added:
- tool for verifying all translations have translatable strings
- tool for checking unused translation strings
- tool for extracting default messages from templates

While `react-intl` has
[babel-plugin-react-intl](https://github.com/yahoo/babel-plugin-react-intl)
library which extracts string messages for translation, angular wrapper requires
own implementation of such tool. In order to extracrt translation keys from the
template, we have to parse it and create AST object. There is a
[babel-plugin-syntax-jsx](https://github.com/babel/babel/tree/master/packages/babel-plugin-syntax-jsx)
plugin which helps to parse JSX syntax and then create AST object. Unfortunately,
there are no babel plugins to parse angular templates. One of the solution can be internal
[`$parse.$$getAst`](https://github.com/angular/angular.js/blob/master/src/ng/parse.js#L1819)
angular method.
