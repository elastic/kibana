# I18n Build Tools

## Default messages extraction tool

### Description

The tool is used to extract default messages from all `*.{js, ts, jsx, tsx, html, handlebars, hbs, jade}` files in provided plugins directories to `translations/en.json` (one JSON per plugin). `translations` directory is created in each of provided plugins directories.\
The tool uses Babel to parse code and build an AST for each file or JS expression if whole file parsing is impossible. So only static parsing is available for messages extraction. It means that no variables, function calls or expressions can be used for ids, messages and context, only string literals.

### I18n examples and restrictions of the syntax

**Global restriction**: Values of `id`, `defaultMessages` and `context` properties must be string literals. Identifiers, template literals and any other expressions are disallowed.

#### Angular (.html)

* **Filter**

  ```
  {{ 'plugin_namespace.message_id' | i18n: {
    values: { /*object*/ },
    defaultMessage: 'Default message string literal',
    context: 'Message context'
  } }}
  ```

  `values` and `context` properties are optional.\
  Don't break `| i18n: {` with line breaks, and don't skip whitespaces around `i18n:`.

* **Directive**

  ```html
  <ANY
    i18n="plugin_namespace.message_id"
    i18n-values="{key: value}"
    i18n-default-message="Default message string literal"
    i18n-context="Message context"
  ></ANY>
  ```

  `i18n-values` and `i18n-context` attributes are optional.

#### React (.jsx, .tsx)

* **\<FormattedMessage\>**

  ```
  ...
  return (
    <p>
      <FormattedMessage
        id="plugin_namespace.message_id"
        defaultMessage="Default message string literal"
        values={{ /*object*/ }}
        context="Message context"
      />
      ...
    </p>
  );
  ...
  ```

  `values` and `context` attributes are optional.\
  JSX element can be parsed only if it is located in a JSX code block.

* **intl.formatMessage**

  ```
  const MyComponentContent = ({ intl }) => (
    <input
      type="text"
      placeholder={intl.formatMessage({
        id: 'plugin_namespace.message_id',
        defaultMessage: 'Default message string literal',
        values: { /*object*/ },
        context: 'Message context'
      })}
    />
  );
  ```

  `values` and `context` properties are optional.\
  Callee of call expression should be either `intl.formatMessage` or `this.props.intl.formatMessage`.\
  Expression can be parsed only if it is located in a JSX expression or in a block of JS code.

#### JavaScript (primarily server-side) (.js, .ts, .jsx, .tsx)

```js
intl(
  'plugin_namespace.message_id',
  {
    values: { /*object*/ },
    defaultMessage: 'Default message string literal',
    context: 'Message context'
  },
);
```

or

```js
intl.translate(
  'plugin_namespace.message_id',
  {
    values: { /*object*/ },
    defaultMessage: 'Default message string literal',
    context: 'Message context'
  },
);
```

`values` and `context` properties are optional.\
 Expression can be parsed only if it is located in syntactically valid JS/TS code. Do not use type assertions in TypeScript for `defaultMessage` or `context` properties, id argument or the second argument of `intl*` call expression. It is never needed for i18n engine use cases.

#### Jade (.jade)

```
#{i18n('plugin_namespace.message_id', {
  values: { /*object*/ },
  defaultMessage: 'Default message string literal',
  context: 'Message context',
})}
```

`values` and `context` properties are optional.\
Expression in `#{...}` is parsed as a JS expression.

#### Handlebars (.handlebars, .hbs)

```
{{i18n 'plugin_namespace.message_id' '{"defaultMessage": "Default message string literal", "context": "Message context"}'}}
```

`values` and `context` properties are optional.`
The third token (the second argument of i18n function call) should be a string literal that contains a valid JSON.

### Usage

```
node scripts/extract_default_translations path/to/plugin path/to/another/plugin ...
```

`path/to/plugin` is a path to a root directory where messages searching should start, `en.json` will be created in `path/to/plugin/translations`.
In case of parsing issues, exception with the necessary information will be thrown to console and extraction will be aborted.

### Output

The tool generates a partly plain JSON5 file. It contains injected `formats` object and plain structured `id: message` pairs.\
If `context` is provided for a message, then its value will be written to result JSON as a comment after `id: message, \\ `.\
Messages are sorted by id, but `formats` object is always on top of JSON.

**Example**:
```js
{
  formats: {
    ...
  },
  'plugin_namespace.message.id-1': 'Default message text 1',
  'plugin_namespace.message.id-2': 'Default message text 2', // Message context
}
```

## Locale files verification tool

### Description

The tool checks locale files primarily for unused messages, missing messages and key duplicates.\
In addition to its primary features, it throws exceptions if:
* locale file has more than one namespace for ids;
* two or more plugins have the same namespace;
* formats object is missing in locale file.

`en.json` is required to use the tool.

### Usage

```
node scripts/check_locale_files path/to/plugin path/to/another/plugin
```

The tool checks namespaces collisions only for provided directories, so plugins shouldn't be verified one-by-one - it will hide possible namespaces collision.

### Output

The tool outputs only information about exceptions. If all locale files are valid, output will be empty.

[WIP]

## Default messages updates checking tool

### Description

The tool checks default messages updates and outputs information about messages removed or added since the last check.

`en.json` is required to use the tool.
The tool compares `en.json` with `messages_cache.json` and outputs a list of new messages ids and a list of removed messages ids if they're not empty, then it updates messages_cache.json.

### Usage

```
node scripts/check_l10n_updates path/to/plugin path/to/another/plugin
```

### Output

The tool creates or updates a `messages_cache.json` which contains an array of ids, extracted from `en.json`.\
`formats` property is ignored by the tool, so `messages_cache.json` contains only messages ids.

[WIP]
