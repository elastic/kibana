---
navigation_title: "Internationalization settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/i18n-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# Internationalization settings in {{kib}} [i18n-settings-kb]

:::{settings} /reference/configuration-reference/internationalization-settings.yml
:::

## Built-in and custom locales

{{kib}} ships translation files for English, French, Japanese, Simplified Chinese, and German. Plugins and admin-installed translation files can add additional locales. Any locale listed in `i18n.locales` for which a translation file exists will be served; locales without translation files fall back to English.

## Per-user language selection

When `i18n.locales` is not empty, individual users can choose their preferred display language:

* {applies_to}`self:` **User Profile page** — Users can select a language from the **Language** section on their profile page (*User icon → Profile*).
* {applies_to}`serverless:` {applies_to}`ech:` **User menu** — Users can select a language from the **Language** option in the user menu available from the application header.

When a user sets a preferred language, it is stored in their user profile and takes effect after a page reload.

### Resolution priority

{{kib}} resolves the display language using the following priority chain:

1. **User profile setting** — The language selected by the user in their profile or the user menu (must be one of `i18n.locales`).
2. **`i18n.defaultLocale` config** — The server-wide default set in `kibana.yml`.

## Example configurations

```yaml
# 1. Default behavior — picker shows the five bundled locales, server defaults
#    to English. Equivalent to omitting all i18n.* keys.

# 2. Curate the picker to a subset:
i18n.locales: ["en", "ja-JP"]
i18n.defaultLocale: "en"

# 3. Disable the per-user picker entirely (server still serves defaultLocale).
#    The flow-style empty array (square brackets) is the supported way to
#    express "no locales"; the block-list form has no syntax for an empty list.
i18n.locales: []
i18n.defaultLocale: "en"

# 4. Legacy form — still works, logs a deprecation warning at startup:
i18n.locale: "ja-JP"
```
