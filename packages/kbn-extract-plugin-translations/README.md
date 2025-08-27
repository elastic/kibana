# @kbn/extract-plugin-translations

A CLI tool to extract plugin-specific translation messages from Kibana translation files.

## Usage

```bash
node scripts/extract_plugin_translations.js --output-dir <OUTPUT_DIR> --starts-with <PREFIX>
```

### Parameters

- `--output-dir`: Directory where plugin-specific translations will be generated (relative to the Kibana repo root)
- `--starts-with`: String prefix to match translation keys (e.g., "console." for console messages)

### Example

To extract all console-specific translations:

```bash
node scripts/extract_plugin_translations.js --output-dir src/plugins/console/translations --starts-with "console."
```

This will:
1. Read all translation files from `x-pack/platform/plugins/private/translations/translations`
2. Filter messages that start with the specified prefix
3. Preserve the `formats` section from the original files
4. Output filtered JSON files to the specified directory

### Output

The tool creates JSON files with the following structure:

```json
{
  "formats": {},
  "messages": {
    "console.someKey": "Translation text",
    "console.anotherKey": "Another translation"
  }
}
```

Each output file corresponds to a locale (e.g., `ja.json`, `zh-CN.json`) and contains only the messages matching the specified prefix.

### Notes

- The `en.json` file is automatically skipped as it uses JavaScript object syntax instead of JSON and English translations are typically defined directly in the source code
- Only files with `.json` extension in the translations directory are processed
- Empty translation files (with 0 matching messages) are still created to maintain consistency

## Consuming Extracted Translations

The extracted translation files can be consumed in your application using the `@kbn/i18n` and `@kbn/i18n-react` packages. Here's an example implementation:

```typescript
import React from 'react';
import { i18n } from '@kbn/i18n';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

// Import translation files (webpack will bundle them)
const translations = {
  en: {
    formats: {},
    messages: {}, // English messages are typically in source code
  },
  'fr-FR': require('./translations/fr-FR.json'),
  'ja-JP': require('./translations/ja-JP.json'),
  'zh-CN': require('./translations/zh-CN.json'),
  'de-DE': require('./translations/de-DE.json'),
};

export const MyPluginApp = ({ lang = 'en' }) => {
  // Get translations for selected language, fallback to English
  const selectedTranslations = translations[lang] || translations.en;

  // Configure the global @kbn/i18n system
  i18n.init({
    locale: lang,
    formats: selectedTranslations.formats,
    messages: selectedTranslations.messages,
  });

  return (
    <IntlProvider locale={lang} messages={selectedTranslations.messages}>
      {/* Your plugin components here */}
      <YourPluginComponent />
    </IntlProvider>
  );
};
```

This approach allows you to:
1. Bundle only the plugin-specific translations
2. Dynamically switch languages at runtime
3. Use the standard Kibana i18n infrastructure
4. Keep translation bundles small by including only relevant messages