# I18n Tools

## Default messages extraction tool

### Description

The tool is used to extract default messages from all `*.{js, ts, jsx, tsx, html }` files in provided plugins directories to a JSON file.

It uses Typescript compiler to parse code and build an AST for each file. The tool is able to validate, extract and match IDs, default messages and descriptions only if they are defined statically and together, otherwise it will fail with detailed explanation. That means one can't define ID in one place and default message in another, or use function call to dynamically create default message etc.

### Examples and restrictions

**Global restrictions**:

The `defaultMessage` and `description` must be string literals, template literals w/o expressions or string-only concatenation expressions, anything else is not allowed. The `id` can be only a string literal.

The `defaultMessage` must contain ICU references to all keys in the `values` and vice versa.

The `description` is optional, `values` is optional too unless `defaultMessage` references to it.

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

### Usage

```bash
node scripts/i18n_extract --path path/to/plugin --path path/to/another/plugin --output-dir ./translations
```

* `--namespace` Filter which namespaces to extract from Kibana. All namespaces must be defined in the `.i18nrc.json` files.
* `--output-dir` specifies a path to a directory, where `en.json` will be created.\
In case of parsing issues, exception with the necessary information will be thrown to console and extraction will be aborted.
* `--include-config` specifies additional paths to `.i18nrc.json` files (may be useful for 3rd-party plugins)

### Output

`<output_path>/en.json`

The generated JSON/JSON5 file contains `formats` object and `messages` object with `id: message` or `id: {text, comment}` pairs. Messages are sorted by id.

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

## Locale files integration tool

### Description

The tool is used for verifying locale file, finding unused / missing messages, key duplications and value references mismatches. If all these
checks are passing, the tool groups messages by namespaces and creates JSON files in right folders.

### Notes

The tool throws an exception if `formats` object is missing in locale file.

### Usage

```bash
node scripts/i18n_integrate --source path/to/locale.json --target x-pack/plugins/translations/translations/locale.json
```

* `--source` path to the JSON file with translations that should be integrated.
* `--target` defines a single path to the JSON file where translations should be integrated to, path mappings from
[.i18nrc.json](../../../.i18nrc.json) are ignored in this case. It's currently used for integrating of Kibana built-in
translations that are located in a single JSON file within `x-pack/translations` plugin.
* `--dry-run` tells the tool to exit after verification phase and not write translations to the disk.
* `--include-config` specifies additional paths to `.i18nrc.json` files (may be useful for 3rd-party plugins)


## Validation tool

### Description

The tool performs a number of checks on internationalized labels and verifies whether they don't conflict with the existing translations.

### Notes

We don't catch every possible misuse of i18n framework, but only the most common and critical ones.

To perform translations compatibility checks tool relies on existing translations referenced in `translations` section of [.i18nrc.json](../../../.i18nrc.json).

Currently auto-fixer (`--fix`) can only automatically fix two types of errors, and for both of them the fix is just removing of conflicting translation entries from JSON files:

* incompatible translation - this error means that the value references in internationalized label differ from the ones
in the existing translation

* unused translation - this error means that the translations file includes label that doesn't exist anymore.

### Usage

```bash
node scripts/i18n_check --fix
```

* `--fix` tells the tool to try to fix as much violations as possible. All errors that tool won't be able to fix will be reported.
* `--namespace` Filter which namespaces to run the i18n checker on. All namespaces must be defined in the `.i18nrc.json` files. This is useful when ran locally against a subset of namespaces on a branch.
* `--ignore-unused` Check against the translation files. Remove outdated message that are no longer inside codebase
* `--ignore-incompatible` Check against the translation files. Remove messages insied the code base that are no longer compatible with the defaultMessage inside the codebase (variables changed)
* `--ignore-untracked` Check against the codebase. Skip checking all files for namespace paths that are not defined inside `.i18nrc.json` files
* `--ignore-malformed` Check against the codebase. Ignore messages with malformed ICU syntax.
* `--include-config` specifies additional paths to `.i18nrc.json` files (may be useful for 3rd-party plugins)