---
navigation_title: "Search sessions settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/search-session-settings-kb.html
applies_to:
  stack: deprecated 8.15.0
  deployment:
    ess: all
    self: all
---

# Search sessions settings in {{kib}} [search-session-settings-kb]

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

`data.search.sessions.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. `false` by default. Set to `true` to enable search sessions.

`data.search.sessions.notTouchedTimeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How long {{kib}} stores search results from unsaved sessions, after the last search in the session completes. The default is `5m`.

`data.search.sessions.maxUpdateRetries` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How many retries {{kib}} can perform while attempting to save a search session. The default is `10`.

`data.search.sessions.defaultExpiration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How long search session results are stored before they are deleted. Extending a search session resets the expiration by the same value. The default is `7d`.

