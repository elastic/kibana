---
navigation_title: "Background search settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/search-session-settings-kb.html
applies_to:
  stack: preview 9.2
  serverless: unavailable
---

# Background search and search sessions settings in {{kib}} [search-session-settings-kb]

:::{important} - Background search replaces Search sessions

[Background search](docs-content://explore-analyze/discover/background-search.md) is a feature introduced in version 9.2. It replaces the **Search sessions** feature, deprecated in version 8.15.
:::

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

:::::{applies-switch}

::::{applies-item} stack: ga 9.2+

`data.search.sessions.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   `false` by default. Set to `true` to enable background searches.

`data.search.sessions.maxUpdateRetries` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   How many retries {{kib}} can perform while attempting to send a search to the background. The default is `10`.

`data.search.sessions.defaultExpiration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   How long background search results are stored before they expire and are deleted. When users extend the validity period of the background search, this setting also determines by how long. The default is `7d`.
::::

::::{applies-item} stack: ga 9.0-9.1

`data.search.sessions.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. `false` by default. Set to `true` to enable search sessions.

`data.search.sessions.notTouchedTimeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How long {{kib}} stores search results from unsaved sessions, after the last search in the session completes. The default is `5m`.

`data.search.sessions.maxUpdateRetries` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How many retries {{kib}} can perform while attempting to save a search session. The default is `10`.

`data.search.sessions.defaultExpiration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 8.15.0. How long search session results are stored before they are deleted. Extending a search session resets the expiration by the same value. The default is `7d`.

::::

:::::