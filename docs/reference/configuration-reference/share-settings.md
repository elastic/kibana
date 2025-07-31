---
navigation_title: "Share settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/share-settings-kb.html
applies_to:
  deployment:
    ess: ga 9.1, ga 8.19
    self: ga 9.1, ga 8.19
---

# Share settings in {{kib}} [share-settings-kb]

Configure share settings in your `kibana.yml` configuration file.
Share settings allow you to customize behavior related to URL sharing in Kibana.

## URL Expiration settings [url-expiration-settings]

URL expiration settings control the behavior of unused URLs cleanup background task, which runs using Task Manager plugin. This task allows you to periodically cleanup saved objects of type `url` that have not been accessed in the specified period of time, specified by `share.url_expiration.duration` config option. Each saved object is a representation of a URL generated through the share functionality. Those settings are disabled by default. You need to manually configure them in order to use this feature.

::::{warning}
We do not recommend enabling this on lower tier Elasticsearch instances as it can lead to memory spikes and instability. The minimum recommend Elasticsearch instance to use the default setting should have 2 GB RAM. Lower tier instances shouldn’t set `share.url_expiration.url_limit` to more than `1000`.
::::

`share.url_expiration.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   If true the URL expiration feature is enabled. Defaults to `false`

`share.url_expiration.duration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls the expiration threshold. Saved object that have not been accessed in the specified period of time will get deleted. Defaults to `1y` (1 year)

`share.url_expiration.check_interval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls how often the task runs. Defaults to `7d` (7 days)

`share.url_expiration.url_limit` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls how many saved objects should be retrieved and scheduled for deletion per one run of the task. Defaults to `10000`.
