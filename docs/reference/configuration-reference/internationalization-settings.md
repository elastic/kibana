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

`i18n.locale` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set the {{kib}} interface language:

    * English - `en`
    * Chinese - `zh-CN`
    * Japanese - `ja-JP`
    * French - `fr-FR`
    * German - `de-DE`
    
    **Default: `en`**

## Per-user language selection

In addition to the server-wide `i18n.locale` setting, individual users can choose their preferred display language:

* **User Profile page** — Non-cloud users can select a language from the **Language** section on their profile page (*User icon → Profile*).
* **User menu** — Cloud users can select a language from the **Language** option in the user menu at the top of the screen.

When a user sets a preferred language, it is stored in their user profile and takes effect after a page reload.

### Resolution priority

{{kib}} resolves the display language using the following priority chain:

1. **User profile setting** — The language selected by the user in their profile or the user menu.
2. **`i18n.locale` config** — The server-wide locale set in `kibana.yml`.
3. **Browser `Accept-Language` header** — The browser's preferred language. This is only used as a fallback when `i18n.locale` is not explicitly set (i.e., the default `en`).


