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

1. **User profile setting** — The language selected by the user in their
   profile or the user menu (must be one of `i18n.locales`).
2. **`KBN_LOCALE` cookie** — The most recently rendered locale on this
   browser. {{kib}} writes this cookie on every rendered response, so it
   tracks profile changes automatically. The cookie is the fallback used
   on surfaces where the profile isn't available — login pages, error
   pages, and any browsing the user does after signing out. Only used
   when the cookie value matches a locale {{kib}} can serve.
3. **`Accept-Language` header** {applies_to}`serverless: ga` — On
   serverless deployments, {{kib}} consults the browser's
   `Accept-Language` preferences when neither the profile setting nor
   the cookie produces a match. The first weighted preference that's an
   exact match (region included) for an entry in `i18n.locales` wins.
   This step is skipped on traditional/self-managed deployments to keep
   existing users' language stable across upgrades.
4. **`i18n.defaultLocale` config** — The server-wide default set in `kibana.yml`.

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
will always fall back to `i18n.defaultLocale` (or `Accept-Language` on
serverless deployments) rather than remembering the previously resolved locale.

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

# 5. Disable the KBN_LOCALE cookie:
i18n.allowLocaleCookie: false
```