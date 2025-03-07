---
navigation_title: "Search sessions settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/search-session-settings-kb.html
---

# Search sessions settings in {{kib}} [search-session-settings-kb]


::::{admonition} Deprecated in 8.15.0.
:class: warning

Search Sessions are deprecated and will be removed in a future version.
::::


Configure the search session settings in your `kibana.yml` configuration file.

[8.15.0] `data.search.sessions.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   Set to `true` (default) to enable search sessions.

[8.15.0] `data.search.sessions.notTouchedTimeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   How long {{kib}} stores search results from unsaved sessions, after the last search in the session completes. The default is `5m`.

[8.15.0] `data.search.sessions.maxUpdateRetries` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   How many retries {{kib}} can perform while attempting to save a search session. The default is `10`.

[8.15.0] `data.search.sessions.defaultExpiration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ess}}")
:   How long search session results are stored before they are deleted. Extending a search session resets the expiration by the same value. The default is `7d`.

