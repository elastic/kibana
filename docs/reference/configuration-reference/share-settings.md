---
navigation_title: "Sharing settings"
applies_to:
  stack: ga 9.1
  serverless: unavailable
---

# Sharing settings in {{kib}} [share-settings-kb]

Configure sharing settings in your `kibana.yml` configuration file.
These settings allow you to customize the behavior of URL sharing in {{kib}}.

## URL expiration settings [url-expiration-settings]

URL expiration settings control the behavior of the unused URLs cleanup background task, which runs using the Task Manager plugin. This task allows you to periodically clean up saved objects of type `url` that have not been accessed in the specified period of time, controlled by the `share.url_expiration.duration` configuration option. Each saved object is a representation of a URL generated through the sharing functionality. Those settings are disabled by default. You must manually configure them in order to use this feature.

::::{warning}
The {{es}} instance should have at least 2 GB RAM to use the URLs cleanup background task with its default settings.

For {{es}} instances with less than 2 GB RAM, we do not recommend enabling this feature because it can lead to memory spikes and instability. If you still enable it on an instance with such limited RAM, `share.url_expiration.url_limit` should not exceed `1000`.
::::

`share.url_expiration.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   If `true` the URL expiration feature is enabled. Defaults to `false`.

`share.url_expiration.duration` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls the expiration threshold. Saved object that have not been accessed in the specified period of time will get deleted. Defaults to `1y` (1 year).

`share.url_expiration.check_interval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls how often the task runs. Defaults to `7d` (7 days).

`share.url_expiration.url_limit` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls how many saved objects should be retrieved and scheduled for deletion per one run of the task. Defaults to `10000`.
