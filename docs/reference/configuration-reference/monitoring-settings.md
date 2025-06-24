---
navigation_title: "Monitoring settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/monitoring-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# Monitoring settings in {{kib}} [monitoring-settings-kb]

By default, **{{stack-monitor-app}}** is enabled, but data collection is disabled. When you first start {{kib}} monitoring, you are prompted to enable data collection. If you are using {{stack-security-features}}, you must be signed in as a user with the `cluster:manage` privilege to enable data collection. The built-in `superuser` role has this privilege and the built-in `elastic` user has this role.

You can adjust how monitoring data is collected from {{kib}} and displayed in {{kib}} by configuring settings in the `kibana.yml` file. There are also `monitoring.ui.elasticsearch.*` settings, which support the same values as [{{kib}} configuration settings](/reference/configuration-reference/general-settings.md).

To control how data is collected from your {{es}} nodes, you configure [`xpack.monitoring.collection` settings](elasticsearch://reference/elasticsearch/configuration-reference/monitoring-settings.md) in `elasticsearch.yml`. To control how monitoring data is collected from Logstash, configure monitoring settings in `logstash.yml`.

For more information, check out [Monitor a cluster](docs-content://deploy-manage/monitor.md).

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

## General monitoring settings [monitoring-general-settings]

`monitoring.cluster_alerts.email_notifications.enabled`
:   Deprecated in 7.11. When enabled, sends email notifications for Watcher alerts to the specified email address. The default is `true`.

`monitoring.cluster_alerts.email_notifications.email_address` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Deprecated in 7.11. When enabled, specifies the email address where you want to receive cluster alert notifications.

`monitoring.ui.ccs.enabled`
:   Set to `true` (default) to enable [cross-cluster search](docs-content://solutions/search/cross-cluster-search.md) of your monitoring data. The [`remote_cluster_client`](docs-content://deploy-manage/remote-clusters/remote-clusters-settings.md) role must exist on each node.

`monitoring.ui.elasticsearch.hosts`
:   Specifies the location of the {{es}} cluster where your monitoring data is stored.

    By default, this is the same as [`elasticsearch.hosts`](/reference/configuration-reference/general-settings.md#elasticsearch-hosts). This setting enables you to use a single {{kib}} instance to search and visualize data in your production cluster as well as monitor data sent to a dedicated monitoring cluster.


`monitoring.ui.elasticsearch.username`
:   Specifies the username used by {{kib}} monitoring to establish a persistent connection in {{kib}} to the {{es}} monitoring cluster and to verify licensing status on the {{es}} monitoring cluster when using `monitoring.ui.elasticsearch.hosts`.

    All other requests performed by **{{stack-monitor-app}}** to the monitoring {{es}} cluster uses the authenticated user’s credentials, which must be the same on both the {{es}} monitoring cluster and the {{es}} production cluster.

    If not set, {{kib}} uses the value of the [`elasticsearch.username`](/reference/configuration-reference/general-settings.md#elasticsearch-user-passwd) setting.


`monitoring.ui.elasticsearch.password`
:   Specifies the password used by {{kib}} monitoring to establish a persistent connection in {{kib}}  to the {{es}} monitoring cluster and to verify licensing status on the {{es}} monitoring cluster when using `monitoring.ui.elasticsearch.hosts`.

    All other requests performed by **{{stack-monitor-app}}** to the monitoring {{es}} cluster use the authenticated user’s credentials, which must be the same on both the {{es}} monitoring cluster and the {{es}} production cluster.

    If not set, {{kib}} uses the value of the [`elasticsearch.password`](/reference/configuration-reference/general-settings.md#elasticsearch-user-passwd) setting.


`monitoring.ui.elasticsearch.serviceAccountToken`
:   Specifies a [service account token](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-service-token) for the {{es}} cluster where your monitoring data is stored when using `monitoring.ui.elasticsearch.hosts`.  This setting is an alternative to using `monitoring.ui.elasticsearch.username` and `monitoring.ui.elasticsearch.password`.

`monitoring.ui.elasticsearch.pingTimeout`
:   Specifies the time in milliseconds to wait for {{es}} to respond to internal health checks. By default, it matches the [`elasticsearch.pingTimeout`](/reference/configuration-reference/general-settings.md#elasticsearch-pingTimeout) setting, which has a default value of `30000`.

`monitoring.ui.elasticsearch.ssl`
:   Shares the same configuration as [`elasticsearch.ssl`](/reference/configuration-reference/general-settings.md#elasticsearch-ssl-cert-key). These settings configure encrypted communication between {{kib}} and the monitoring cluster.


## Monitoring collection settings [monitoring-collection-settings]

These settings control how data is collected from {{kib}}.

`monitoring.kibana.collection.enabled`
:   Set to `true` (default) to enable data collection from the {{kib}} NodeJS server for {{kib}} dashboards to be featured in **{{stack-monitor-app}}**.

`monitoring.kibana.collection.interval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies the number of milliseconds to wait in between data sampling on the {{kib}} NodeJS server for the metrics that are displayed in the {{kib}} dashboards. Defaults to `10000` (10 seconds).


## Monitoring UI settings [monitoring-ui-settings]

These settings adjust how **{{stack-monitor-app}}** displays monitoring data. However, the defaults work best in most circumstances. For more information about configuring {{kib}}, see [Setting {{kib}} server properties](/reference/configuration-reference/general-settings.md).

`monitoring.ui.elasticsearch.logFetchCount`
:   Specifies the number of log entries to display in **{{stack-monitor-app}}**. Defaults to `10`. The maximum value is `50`.

$$$monitoring-ui-enabled$$$ `monitoring.ui.enabled`
:   Set to `false` to hide **{{stack-monitor-app}}**. The monitoring back-end continues to run as an agent for sending {{kib}} stats to the monitoring cluster. Defaults to `true`.

`monitoring.ui.logs.index`
:   Specifies the name of the indices that are shown on the [**Logs**](docs-content://deploy-manage/monitor/monitoring-data/elasticsearch-metrics.md#logs-monitor-page) page in **{{stack-monitor-app}}**. The default value is `filebeat-*`.

`monitoring.ui.metricbeat.index`
:   :::{admonition} Deprecated in 8.15.0
    This setting was deprecated in 8.15.0.
    :::

    Used as a workaround to avoid querying `metricbeat-*` indices which are now no longer queried. The default value is `metricbeat-*`.

`monitoring.ui.max_bucket_size`
:   Specifies the number of term buckets to return out of the overall terms list when performing terms aggregations to retrieve index and node metrics. For more information about the `size` parameter, see [Terms Aggregation](elasticsearch://reference/aggregations/search-aggregations-bucket-terms-aggregation.md#search-aggregations-bucket-terms-aggregation-size). Defaults to `10000`.

`monitoring.ui.min_interval_seconds` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies the minimum number of seconds that a time bucket in a chart can represent. Defaults to 10. If you modify the `monitoring.ui.collection.interval` in `elasticsearch.yml`, use the same value in this setting.

`monitoring.ui.kibana.reporting.stale_status_threshold_seconds`
:   Specifies how many seconds can pass before the Kibana status reports are considered stale. Defaults to `120`.


### Monitoring UI container settings [monitoring-ui-cgroup-settings]

**{{stack-monitor-app}}** exposes the Cgroup statistics that we collect for you to make better decisions about your container performance, rather than guessing based on the overall machine performance. If you are not running your applications in a container, then Cgroup statistics are not useful.

`monitoring.ui.container.elasticsearch.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   For {{es}} clusters that are running in containers, this setting changes the **Node Listing** to display the CPU utilization based on the reported Cgroup statistics. It also adds the calculated Cgroup CPU utilization to the **Node Overview** page instead of the overall operating system’s CPU utilization. Defaults to `false`.

`monitoring.ui.container.logstash.enabled`
:   For {{ls}} nodes that are running in containers, this setting changes the {{ls}} **Node Listing** to display the CPU utilization based on the reported Cgroup statistics. It also adds the calculated Cgroup CPU utilization to the {{ls}} node detail pages instead of the overall operating system’s CPU utilization. Defaults to `false`.

