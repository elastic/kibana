---
navigation_title: "i18n settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/i18n-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# i18n settings in {{kib}} [i18n-settings-kb]

You do not need to configure any settings to run Kibana in English.

`i18n.defaultLocale` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.5+`
:   The locale used for server-rendered strings and as the default for users
    who haven't picked a preferred language. Must be one of the values listed in `i18n.locales` when
    that setting is non-empty.

    **Default: `en`**

`i18n.locales` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.5+`
:   The list of locales that {{kib}} offers in the language picker.
    Locales not in this list are not available to users, even if translation files
    for them are installed. Set to `[]` to disable the language picker.

    **Default:** `["en", "fr-FR", "ja-JP", "zh-CN", "de-DE"]`

`i18n.locale` {applies_to}`stack: deprecated 9.5+`
:   Replaced by `i18n.defaultLocale`. {{kib}} continues to honor `i18n.locale`
    if set, logging a deprecation warning at startup.

## Built-in and custom locales

{{kib}} ships translation files for English, French, Japanese, Simplified
Chinese, and German. Plugins (and admin-installed translation files) can add
additional locales. Any locale you list in `i18n.locales` for which a
translation file exists will be served; locales without translation files fall
back to English.

## Per-user language selection

When `i18n.locales` is not empty, individual users can choose their preferred
display language:

* {applies_to}`self:` **User Profile page** — Users can select a language from the
  **Language** section on their profile page (*User icon → Profile*).
* {applies_to}`serverless:` {applies_to}`ech:` **User menu** — Users can select a language from the **Language**
  option in the user menu available from the application header.

When a user sets a preferred language, it is stored in their user profile and
takes effect after a page reload.

### Resolution priority

{{kib}} resolves the display language using the following priority chain:

1. **User profile setting** — The language selected by the user in their
   profile or the user menu (must be one of `i18n.locales`).
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
