# I18n

Kibana relies on several UI frameworks (ReactJS and AngularJS) and
requires localization in different environments (browser and NodeJS).
Internationalization engine is framework agnostic and consumable in
all parts of Kibana (ReactJS, AngularJS and NodeJS). In order to simplify
internationalization in UI frameworks, the additional abstractions are
built around the I18n engine: `react-intl` for React and custom
components for AngularJS. [React-intl](https://github.com/yahoo/react-intl)
is built around [intl-messageformat](https://github.com/yahoo/intl-messageformat),
so both React and AngularJS frameworks use the same engine and the same
message syntax.

## Localization files

Localization files are JSON files.

Using comments can help to understand which section of the application
the localization key is used for. Also `namespaces`
are used in order to simplify message location search. For example, if
we are going to translate the title of `/management/sections/objects/_objects.html`
file, we should use message path like this: `'management.objects.objectsTitle'`.

Each Kibana plugin has a separate folder with translation files located at
```
{path/to/plugin}/translations/{locale}.json
```

where `locale` is [ISO 639 language code](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes).

For example:
```
src/legacy/core_plugins/kibana/translations/fr.json
```

The engine scans `x-pack/legacy/plugins/*/translations`, `src/core_plugins/*/translations`, `plugins/*/translations` and `src/legacy/ui/translations` folders on initialization, so there is no need to register translation files.

The engine uses a `config/kibana.yml` file for locale resolution process. If locale is
defined via `i18n.locale` option in `config/kibana.yml` then it will be used as a base
locale, otherwise i18n engine will fall back to `en`. The `en` locale will also be used
if translation can't be found for the base non-English locale.

One of our technical requirements is to have default messages in the templates
themselves, and those messages will always be in English, so we don't have to keep
`en.json` file in repository. We can generate that file from `defaultMessage`s
defined inline.

__Note:__ locale defined in `i18n.locale` and the one used for translation files should
match exactly, e.g. `i18n.locale: zh` and `.../translations/zh-CN.json` won't match and
default English translations will be used, but `i18n.locale: zh-CN` and`.../translations/zh-CN.json`
or `i18n.locale: zh` and `.../translations/zh.json` will work as expected.

__Note:__ locale should look like `zh-CN` where `zh` - lowercase two-letter or three-letter ISO-639 code
and `CN` - uppercase two-letter ISO-3166 code (optional).
[ISO-639](https://www.iso.org/iso-639-language-codes.html) and [ISO-3166](https://www.iso.org/iso-3166-country-codes.html) codes should be separated with `-` character.

## I18n engine

I18n engine is the platform agnostic abstraction that helps to supply locale
data to UI frameworks and provides methods for the direct translation.

Here is the public API exposed by this engine:

- `addTranslation(newTranslation: Translation, [locale: string])` - provides a way to register
translations with the engine
- `getTranslation()` - returns messages for the current language
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
- `translate(id: string, { values: object, defaultMessage: string, description: string })` –
translate message by id. `description` is optional context comment that will be extracted
by i18n tools and added as a comment next to translation message at `defaultMessages.json`.
- `init(messages: Map<string, string>)` - initializes the engine
- `load(translationsUrl: string)` - loads JSON with translations from the specified URL and initializes i18n engine with them.

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

## Vanilla JS

`Intl-messageformat` package assumes that the
[Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
global object exists in the runtime. `Intl` is present in all modern
browsers and Node.js 0.10+. In order to load i18n engine
in Node.js we should simply `import` this module (in Node.js, the
[data](https://github.com/yahoo/intl-messageformat/tree/master/dist/locale-data)
for all 200+ languages is loaded along with the library) and pass the translation
messages into `init` method:

```js
import { i18n } from '@kbn/i18n';

i18n.init(messages);
```

One common use-case is that of internationalizing a string constant. Here's an
example of how we'd do that:

```js
import { i18n } from '@kbn/i18n';

export const HELLO_WORLD = i18n.translate('hello.wonderful.world', {
  defaultMessage: 'Greetings, planet Earth!',
});
```

One more example with a parameter:

```js
import { i18n } from '@kbn/i18n';

export function getGreetingMessage(userName) {
  return i18n.translate('hello.wonderful.world', {
    defaultMessage: 'Greetings, {name}!',
    values: { name: userName },
    description: 'This is greeting message for main screen.'
  });
}
```

We're also able to use all methods exposed by the i18n engine
(see [I18n engine](#i18n-engine) section above for more details).

## React

[React-intl](https://github.com/yahoo/react-intl) library is used for internalization
React part of the application. It provides React components and an API to format
dates, numbers, and strings, including pluralization and handling translations.

React Intl uses the provider pattern to scope an i18n context to a tree of components.
`IntlProvider` component is used to setup the i18n context for a tree. After that we
are able to use `FormattedMessage` component in order to translate messages.
`IntlProvider` should wrap react app's root component (inside each react render method).

In order to translate messages we need to use `I18nProvider` component that
uses I18n engine under the hood:

```js
import React from 'react';
import ReactDOM from 'react-dom';
import { I18nProvider } from '@kbn/i18n/react';

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
```jsx
import React, { Component } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

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
          defaultMessage="Hello {name}, you have {unreadCount, number} {unreadCount, plural,
            one {message}
            other {messages}
          }"
          values={{name: <b>{name}</b>, unreadCount}}
        />
        ...
      </p>
    );
  }
}
```

Optionally we can pass `description` prop into `FormattedMessage` component.
This prop is optional context comment that will be extracted by i18n tools
and added as a comment next to translation message at `defaultMessages.json`

**NOTE:** To minimize the chance of having multiple `I18nProvider` components in the React tree, try to use `I18nProvider` only to wrap the topmost component that you render, e.g. the one that's passed to `reactDirective` or `ReactDOM.render`.

### FormattedRelative

`FormattedRelative` expects several attributes (read more [here](https://github.com/yahoo/react-intl/wiki/Components#formattedrelative)), including

- `value` that can be parsed as a date,
- `formats` that should be one of `'years' | 'months' | 'days' | 'hours' | 'minutes' | 'seconds'` (this options are configured in [`formats.ts`](./src/core/formats.ts))
-  etc.

If `formats` is not provided then it will be chosen automatically:\
`x seconds ago` for `x < 60`, `1 minute ago` for `60 <= x < 120`, etc.

```jsx
<FormattedRelative
  value={Date.now() - 90000}
  format="seconds"
/>
```
Initial result: `90 seconds ago`
```jsx
<FormattedRelative
  value={Date.now() - 90000}
/>
```
Initial result: `1 minute ago`

### Attributes translation in React

The long term plan is to rely on using `FormattedMessage` and `i18n.translate()` by statically importing `i18n` from the `@kbn/i18n` package. **Avoid using `injectI18n` and rely on `i18n.translate()` instead.**

React wrapper provides an ability to inject the imperative formatting API into a React component via its props using `injectI18n` Higher-Order Component. This should be used when your React component needs to format data to a string value where a React element is not suitable; e.g., a `title` or `aria` attribute. In order to use it you should wrap your component with `injectI18n` Higher-Order Component. The formatting API will be provided to the wrapped component via `props.intl`.

React component as a pure function:

```js
import React from 'react';
import { injectI18n, intlShape } from '@kbn/i18n/react';

export const MyComponent = injectI18n({ intl }) => (
  <input
    type="text"
    placeholder={intl.formatMessage(
      {
        id: 'welcome',
        defaultMessage: 'Hello {name}, you have {unreadCount, number}\
{unreadCount, plural, one {message} other {messages}}',
        description: 'Message description',
      },
      { name, unreadCount }
    )}
  />
));

MyComponent.WrappedComponent.propTypes = {
  intl: intlShape.isRequired,
};
```

React component as a class:

```js
import React from 'react';
import { injectI18n, intlShape } from '@kbn/i18n/react';

export const MyComponent = injectI18n(
  class MyComponent extends React.Component {
    static propTypes = {
      intl: intlShape.isRequired,
    };

    render() {
      const { intl } = this.props;

      return (
        <input
          type="text"
          placeholder={intl.formatMessage({
            id: 'kbn.management.objects.searchPlaceholder',
            defaultMessage: 'Search',
          })}
        />
      );
    }
  }
);
```

## AngularJS

The long term plan is to rely on using `i18n.translate()` by statically importing `i18n` from the `@kbn/i18n` package. **Avoid using the `i18n` filter and the `i18n` service injected in controllers, directives, services.**

AngularJS wrapper has 4 entities: translation `provider`, `service`, `directive`
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
- `i18n(id: string, { values: object, defaultMessage: string, description: string })` –
translate message by id

The translation `filter` is used for attributes translation and has
the following syntax:
```
{{ ::'translationId' | i18n: { values: object, defaultMessage: string, description: string } }}
```

Where:
- `translationId` - translation id to be translated
- `values` - values to pass into translation
- `defaultMessage` - will be used unless translation was successful (the final
  fallback in english, will be used for generating `en.json`)
- `description` - optional context comment that will be extracted by i18n tools
and added as a comment next to translation message at `defaultMessages.json`

The translation `directive` has the following syntax:
```html
<ANY
  i18n-id="{string}"
  i18n-default-message="{string}"
  [i18n-values="{object}"]
  [i18n-description="{string}"]
></ANY>
```

Where:
- `i18n-id` - translation id to be translated
- `i18n-default-message` - will be used unless translation was successful
- `i18n-values` - values to pass into translation
- `i18n-description` - optional context comment that will be extracted by i18n tools
and added as a comment next to translation message at `defaultMessages.json`

If HTML rendering in `i18n-values` is required then value key in `i18n-values` object
should have `html_` prefix. Otherwise the value will be inserted to the message without
HTML rendering.\
Example:
```html
<p
  i18n-id="namespace.id"
  i18n-default-message="Text with an emphasized {text}."
  i18n-values="{
    html_text: '<em>text</em>',
  }"
></p>
```

Angular `I18n` module is placed into `autoload` module, so it will be
loaded automatically. After that we can use i18n directive in Angular templates:
```html
<span
  i18n-id="welcome"
  i18n-default-message="Hello!"
></span>
```

In order to translate attributes in AngularJS we should use `i18nFilter`:
```html
<input
  type="text"
  placeholder="{{ ::'kbn.management.objects.searchAriaLabel' | i18n: {
    defaultMessage: 'Search { title } Object',
    values: { title }
  } }}"
>
```

## I18n tools

In order to simplify localization process, some additional tools were implemented:
- tool for verifying all translations have translatable strings and extracting default messages from templates
- tool for verifying translation files and integrating them to Kibana

[I18n tools documentation](../../src/dev/i18n/README.md)
