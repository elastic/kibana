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

To apply these settings in your deployment, refer to [Elastic Stack settings](docs-content://deploy-manage/stack-settings.md). On {{serverless-full}}, Elastic manages these settings for you.

## Built-in and custom locales

{{kib}} ships translation files for English, French, Japanese, Simplified Chinese, and German. Plugins and admin-installed translation files can add additional locales. Any locale listed in `i18n.locales` for which a translation file exists will be served; locales without translation files fall back to English.

## Per-user language selection
```{applies_to}
stack: beta 9.5
serverless: beta
```

Each user can change their display language from the user menu or profile page. For steps, see [Change the interface language in Kibana](docs-content://cloud-account/change-interface-language.md).

When `i18n.locales` is not empty, language selection is available to users. When a user sets a preferred language, it is stored in their user profile and takes effect after a page reload.

### Resolution priority

{{kib}} resolves the display language using the following priority chain:

1. **User profile setting** — The language selected by the user in their
   profile or the user menu (must be one of `i18n.locales`).
2. **`KBN_LOCALE` cookie** — The most recently rendered locale on this
   browser. {{kib}} writes this cookie on every rendered response, so it
   tracks profile changes automatically. The cookie is the fallback used
   on surfaces where the profile isn't available — login pages, error
   pages, and any browsing the user does after signing out. Only used
   when the cookie value matches a locale {{kib}} can serve.
3. **`i18n.defaultLocale` config (when explicitly set)** — When an admin
   sets `i18n.defaultLocale` to a value other than the built-in `en`
   default, that server-wide choice takes precedence over browser
   detection. Per-user signals (profile, cookie) above still win over it.
4. **`Accept-Language` header** — When the steps above produce no match
   and `i18n.defaultLocale` is left at its `en` default, {{kib}} consults
   the browser's `Accept-Language` preferences. The first weighted
   preference matching an entry in `i18n.locales`, exactly or by language
   (`fr-CH` or bare `fr` can resolve to a configured `fr-FR`), wins.
5. **`i18n.defaultLocale` config** — The server-wide default (`en` unless
   overridden) set in `kibana.yml`, used when nothing above matches.

#### About the `KBN_LOCALE` cookie

{{kib}} sets a `KBN_LOCALE` cookie on every rendered response containing
the resolved locale id (for example, `KBN_LOCALE=ja-JP`). Attributes:

- Path scoped to the {{kib}} `serverBasePath`.
- `SameSite=Lax`, `Max-Age` of one year, and `Secure` when the response is over HTTPS.
- `HttpOnly`. The value is a preference, not a secret, but {{kib}} does not need browser-side JavaScript to read it.

Privacy posture: `KBN_LOCALE` is a strictly-necessary preference cookie.
It does not track the user, store identity, or enable cross-site activity.

To disable the cookie entirely, set `i18n.allowLocaleCookie: false` in
`kibana.yml`. When disabled, the per-user language selection still works via
user profiles; however, anonymous pages and pages visited after signing out
resolve their locale from `i18n.defaultLocale` when it is explicitly set, and
otherwise from the browser's `Accept-Language` preferences (falling back to the
`en` default when no preference matches), rather than remembering the
previously resolved locale.

## Example configurations

```yaml
# 1. Default behavior — language selection offers the five bundled locales,
#    server defaults to English. Equivalent to omitting all i18n.* keys.

# 2. Curate the available languages to a subset:
i18n.locales: ["en", "ja-JP"]
i18n.defaultLocale: "en"

# 3. Disable language selection entirely (server still serves defaultLocale).
#    The flow-style empty array (square brackets) is the supported way to
#    express "no locales"; the block-list form has no syntax for an empty list.
i18n.locales: []
i18n.defaultLocale: "en"

# 4. Legacy form — still works, logs a deprecation warning at startup:
i18n.locale: "ja-JP"

# 5. Disable the KBN_LOCALE cookie:
i18n.allowLocaleCookie: false
```