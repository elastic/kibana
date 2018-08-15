# I18n Build Tools

## Default messages extraction tool

### Description

The tool is used to extract default messages from all `*.{js, ts, jsx, tsx, html, handlebars, hbs, jade}` files in provided plugins directories to a JSON file.\
The tool uses Babel to parse code and build an AST for each file or JS expression if whole file parsing is impossible. So only static parsing is available for messages extraction. It means that no variables, function calls or expressions can be used for ids, messages and context, only string literals.

### I18n examples and restrictions of the syntax

**Global restriction**: Values of `id`, `defaultMessage` and `context` properties must be string literals. Identifiers, template literals and any other expressions are disallowed.

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
  <p
    i18n="plugin_namespace.message_id"
    i18n-values="{key: value}"
    i18n-default-message="Default message string literal"
    i18n-context="Message context"
  ></p>
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
  Callee of call expression should be either `intl.formatMessage` or `*.intl.formatMessage`.

#### JavaScript (primarily server-side) (.js, .ts, .jsx, .tsx)

```js
intl('plugin_namespace.message_id', {
  values: {
    /*object*/
  },
  defaultMessage: 'Default message string literal',
  context: 'Message context',
});
```

or

```js
intl.translate('plugin_namespace.message_id', {
  values: {
    /*object*/
  },
  defaultMessage: 'Default message string literal',
  context: 'Message context',
});
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
node scripts/extract_default_translations --path path/to/plugins --output ./translations --output-format json5
```

`path/to/plugin` is an example of path to a directory(-es) where messages searching should start. By default `--path` is `.`, it means that messages from all paths in `.i18nrc.json` will be parsed. Each specified path should start with any path in `.i18nrc.json` or be a part of it.\
`--output` specifies a path to a directory, where `en.json` will be created, if `--output` is not provided, `en.json` generation will be skipped. It is useful if you want to validate i18n engine usage.\
In case of parsing issues, exception with the necessary information will be thrown to console and extraction will be aborted.
`--output-format` specifies format of generated `en.json` (if `--output` is provided). By default it is `json`. Use it only if you need a JSON5 file.

### Output

`<output_path>/en.json`

The tool generates a JSON file, if `--output` path is provided. It contains injected `formats` object and `id: message` or `id: {text, comment}` pairs.\
Messages are sorted by id, but `formats` object is always at the top of JSON.

**Example**:

```json
{
  "formats": {},
  "plugin_namespace.message.id-1": "Default message text 1",
  "plugin_namespace.message.id-2": {
    "text": "Default message text 2",
    "comment": "Message context"
  }
}
```

## Locale files verification / integration tool

### Description

The tool is used for verifying locale files, finding unused / missing messages, key duplications, splitting them by namespaces and moving to the right folders.

### Notes

The tool throws exception if formats object is missing in locale file.

### Usage

```
node scripts/integrate_locale_files --path path/to/locales/folder
```

### Output

The tool generates locale files in plugins folders after splitting them by namespaces.\
The tool outputs only information about exceptions to the console. If all locale files are valid, console output will be empty.
