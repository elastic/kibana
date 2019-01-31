# I18n Tools

## Default messages extraction tool

### Description

The tool is used to extract default messages from all `*.{js, ts, jsx, tsx, html, handlebars, hbs, pug}` files in provided plugins directories to a JSON file.

It uses Babel to parse code and build an AST for each file or a single JS expression if whole file parsing is impossible. The tool is able to validate, extract and match IDs, default messages and descriptions only if they are defined statically and together, otherwise it will fail with detailed explanation. That means one can't define ID in one place and default message in another, or use function call to dynamically create default message etc.

### Examples and restrictions

**Global restrictions**:

The `defaultMessage` and `description` must be string literals, template literals w/o expressions or string-only concatenation expressions, anything else is not allowed. The `id` can be only a string literal.

The `defaultMessage` must contain ICU references to all keys in the `values` and vice versa.

The `description` is optional, `values` is optional too unless `defaultMessage` references to it.

* **Angular (.html)**

  * **Filter**

    ```
    {{ ::'pluginNamespace.messageId' | i18n: {
      defaultMessage: 'Default message string literal, {key}',
      values: { key: 'value' },
      description: 'Message context or description'
    } }}
    ```

    * Don't break `| i18n: {` with line breaks, and don't skip whitespaces around `i18n:`.
    * `::` operator is optional. Omit it if you need data binding for the `values`.

  * **Directive**

    ```html
    <p
      i18n-id="pluginNamespace.messageId"
      i18n-default-message="Default message string literal, {key}. {emphasizedText}"
      i18n-values="{ key: value, html_emphasizedText: htmlString }"
      i18n-description="Message context or description"
    ></p>
    ```

    * `html_` prefixes will be removed from `i18n-values` keys before validation.

* **React (.jsx, .tsx)**

  * **\<FormattedMessage\>**

    ```jsx
    ...
    return (
      <p>
        <FormattedMessage
          id="pluginNamespace.messageId"
          defaultMessage="Default message string literal, {key}"
          values={{ key: 'value' }}
          description="Message context or description"
        />
        ...
      </p>
    );
    ...
    ```

    * JSX element can be parsed only if it is located in a JSX code block (not in a string).

  * **intl.formatMessage**

    ```jsx
    const MyComponentContent = ({ intl }) => (
      <input
        type="text"
        placeholder={intl.formatMessage(
          {
            id: 'pluginNamespace.messageId',
            defaultMessage: 'Default message string literal, {key}',
            description: 'Message context or description'
          },
          {
            key: 'value',
          }
        )}
      />
    );
    ```

    * Callee of call expression should be either `intl.formatMessage` or `*.intl.formatMessage`.

* **JavaScript or TypeScript (primarily server-side) (.js, .ts, .jsx, .tsx)**

  ```js
  i18n('pluginNamespace.messageId', {
    defaultMessage: 'Default message string literal, {key}',
    values: {
      key: 'value',
    },
    description: 'Message context or description',
  });
  ```

  or

  ```js
  i18n.translate('pluginNamespace.messageId', {
    defaultMessage: 'Default message string literal, {key}',
    values: {
      key: 'value',
    },
    description: 'Message context or description',
  });
  ```

  * Expression can be parsed only if it is located in syntactically valid JS/TS code. Do not use type assertions in TypeScript for `defaultMessage` or `description` properties, id argument or the second argument of `i18n*` call expression. It is never needed for i18n engine use cases.

* **Pug (.pug)**

  ```
  #{i18n('pluginNamespace.messageId', {
    defaultMessage: 'Default message string literal, {key}',
    values: { key: 'value' },
    description: 'Message context or description',
  })}
  ```

  * Expression in `#{...}` is parsed as a JS expression.

* **Handlebars (.handlebars, .hbs)**

  ```hbs
  {{i18n 'pluginNamespace.messageId' '{"defaultMessage": "Default message string literal", "description": "Message context or description"}'}}
  ```

  * The `values` and `description` are optional.
  * The third token (the second argument of i18n function call) should be a string literal that contains a valid JSON.

### Usage

```bash
node scripts/i18n_check --path path/to/plugin --path path/to/another/plugin --output ./translations --output-format json5
```

* `path/to/plugin` is an example of path to a directory(-es) where messages searching should start. By default `--path` is `.`, it means that messages from all paths in `.i18nrc.json` will be parsed. Each specified path should start with any path in `.i18nrc.json` or be a part of it.
* `--output` specifies a path to a directory, where `en.json` will be created, if `--output` is not provided, `en.json` generation will be skipped. It is useful if you want to validate i18n engine usage.\
In case of parsing issues, exception with the necessary information will be thrown to console and extraction will be aborted.
* `--output-format` specifies format of generated `en.json` (if `--output` is provided). By default it is `json`. Use it only if you need a JSON5 file.

### Output

`<output_path>/en.json`

The tool generates a JSON/JSON5 file only if `--output` path is provided. It contains injected `formats` object and `messages` object with `id: message` or `id: {text, comment}` pairs. Messages are sorted by id.

**Example**:

```json
{
  "formats": {},
  "messages": {
    "pluginNamespace.message.id-1": "Default message text 1",
    "pluginNamespace.message.id-2": {
      "text": "Default message text 2",
      "comment": "Message context or description"
    }
  }
}
```

## Locale files verification / integration tool

### Description

The tool is used for verifying locale file, finding unused / missing messages, key duplications, grouping messages by namespaces and creating JSON files in right folders.

### Notes

The tool throws an exception if `formats` object is missing in locale file.

### Usage

```bash
node scripts/i18n_integrate --path path/to/locale.json
```

### Output

The tool generates locale files in plugin folders and few other special locations based on namespaces and corresponding mappings defined in [.i18nrc.json](../../../.i18nrc.json).
