---
navigation_title: "Reporting settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/reporting-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# Reporting settings in {{kib}} [reporting-settings-kb]


You can configure `xpack.reporting` settings to:

* [Enable or disable the {{report-features}}](#general-reporting-settings)
* [Configure an encryption key to protect sensitive authentication data](#encryption-keys)
* [Choose an access control model of how users will be granted privileges to {{report-features}}](#reporting-advanced-settings)
* [Manage the way reporting tasks run in the {{kib}} server background](#reporting-job-queue-settings)
* [Control how screenshots are captured for PNG/PDF reports](#reporting-capture-settings)
* [Control the limits and capabilities of CSV reports](#reporting-csv-settings)

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

## Enable reporting [general-reporting-settings]

$$$xpack-enable-reporting$$$`xpack.reporting.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   When `true`, enables the {{report-features}}. Set this to `false` to disable {{report-features}} entirely. The default is `true`.

::::{note}
Disabling the {{report-features}} is discouraged. If you need to turn off the ability to generate reports, configure the roles and spaces in the [{{kib}} application privileges](docs-content://deploy-manage/kibana-reporting-configuration.md#grant-user-access).

If needed, you can also prevent a {{kib}} instance from claiming reporting work by setting [`xpack.reporting.queue.pollEnabled: false`](#xpack-reportingQueue-pollEnabled).

::::



## Encryption key setting [encryption-keys]

By default, an encryption key is generated for the {{report-features}} each time you start {{kib}}. If a static encryption key is not persisted in the {{kib}} configuration, any pending reports fail when you restart {{kib}}.

If you are load balancing across multiple {{kib}} instances, each instance needs to have the same reporting encryption key. Otherwise, report generation fails if a report is queued through one instance, and another instance picks up the job from the report queue. The instance that picks up the job is unable to decrypt the reporting job metadata.

$$$xpack-reporting-encryptionKey$$$ `xpack.reporting.encryptionKey` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The static encryption key for reporting. Use an alphanumeric text string that is at least 32 characters. By default, {{kib}} generates a random key when it starts, which causes pending reports to fail after restart. Configure `xpack.reporting.encryptionKey` to preserve the same key across multiple restarts and multiple {{kib}} instances.

```yaml
xpack.reporting.encryptionKey: "something_secret"
```


## Security settings [reporting-advanced-settings]

Reporting privileges are configured with [{{kib}} application privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md). You can control the spaces and applications where users are allowed to generate reports.


## Background job settings [reporting-job-queue-settings]

Reporting generates reports on the {{kib}} server as background tasks, and jobs are coordinated using documents in {{es}}. Depending on how often you generate reports and the overall number of reports, you might need to change the following settings.

`xpack.reporting.capture.maxAttempts` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   If capturing a report fails for any reason, {{kib}} will re-queue the report job for retry, as many times as this setting. Defaults to `3`.

`xpack.reporting.queue.indexInterval`
:   :::{admonition} Deprecated in 8.15.0
    This setting was deprecated in 8.15.0.
    :::

    How often Reporting creates a new index to store report jobs and file contents. Valid values are `year`, `month`, `week`, `day`, and `hour`. Defaults to `week`. 
    :::{note}
    This setting exists for backwards compatibility, but is unused. Use the built-in ILM policy provided for the reporting plugin to customize the rollover of Reporting data.
    :::

$$$xpack-reportingQueue-pollEnabled$$$ `xpack.reporting.queue.pollEnabled`
:   When `true`, enables the {{kib}} instance to poll {{es}} for pending jobs and claim them for execution. When `false`, allows the {{kib}} instance to only add new jobs to the reporting queue, list jobs, and provide the downloads to completed reports through the UI. This requires a deployment where at least one other {{kib}} instance in the Elastic cluster has this setting to `true`. The default is `true`.

::::{note}
Running multiple instances of {{kib}} in a cluster for load balancing of reporting requires identical values for [`xpack.reporting.encryptionKey`](#xpack-reporting-encryptionKey) and, if security is enabled, [`xpack.security.encryptionKey`](/reference/configuration-reference/security-settings.md#xpack-security-encryptionKey).
::::


`xpack.reporting.queue.pollInterval`
:   Specifies the [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) that the reporting poller waits between polling the index for any pending Reporting jobs. Can be specified as a number of milliseconds. Defaults to `3s`.

$$$xpack-reporting-q-timeout$$$ `xpack.reporting.queue.timeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   [How long](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) each worker has to produce a report. If your machine is slow or under heavy load, you might need to increase this timeout. If a Reporting job execution goes over this time limit, the job is marked as a failure and no download will be available. Can be specified as a number of milliseconds. Defaults to `4m`.


## PNG/PDF settings [reporting-capture-settings]

::::{note}
We recommend using PNG/PDF reports to export moderate amounts of data only. The feature enables a high-level export capability, but it’s not intended for bulk export. If you need to export several pages of image data, consider using multiple report jobs to export a small number of pages at a time. If the screenshot of exported dashboard contains a large number of pixels, consider splitting the large dashboard into smaller artifacts to use less memory and CPU resources.

For the most reliable configuration of PDF/PNG {{report-features}}, consider installing {{kib}} using [Docker](docs-content://deploy-manage/deploy/self-managed/install-kibana-with-docker.md) or using [Elastic Cloud](docs-content://deploy-manage/deploy/elastic-cloud.md).

::::


To generate PDF and PNG files, Reporting uses an internal "screenshotting" plugin which manages a headless browser that captures screenshots from {{kib}}.

The following settings control the capturing process.

`xpack.screenshotting.capture.timeouts.openUrl` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specify the [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) to allow the Reporting browser to wait for the "Loading…" screen to dismiss and find the initial data for the page. If the time is exceeded, a screenshot is captured showing the current page, and the download link shows a warning message. Can be specified as number of milliseconds. Defaults to `1m`.

`xpack.screenshotting.capture.timeouts.waitForElements` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specify the [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) to allow the Reporting browser to wait for all visualization panels to load on the page. If the time is exceeded, a screenshot is captured showing the current page, and the download link shows a warning message. Can be specified as number of milliseconds. Defaults to `1m`.

`xpack.screenshotting.capture.timeouts.renderComplete` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specify the [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) to allow the Reporting browser to wait for all visualizations to fetch and render the data. If the time is exceeded, a screenshot is captured showing the current page, and the download link shows a warning message. Can be specified as number of milliseconds. Defaults to `2m`.

::::{note}
If any timeouts from `xpack.screenshotting.capture.timeouts.*` settings occur when running a report job, Reporting will log the error and try to continue capturing the page with a screenshot. As a result, a download will be available, but there will likely be errors in the visualizations in the report.
::::


`xpack.screenshotting.capture.loadDelay`
:   :::{admonition} Deprecated in 8.0.0
    This setting was deprecated in 8.0.0.
    :::

    Specify the [amount of time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) before taking a screenshot when visualizations are not evented. All visualizations that ship with {{kib}} are evented, so this setting should not have much effect. If you are seeing empty images instead of visualizations, try increasing this value. **NOTE**: This setting exists for backwards compatibility, but is unused and therefore does not have an affect on reporting performance.


### Chromium headless browser settings [reporting-chromium-settings]

For PDF and PNG reports, Reporting spawns a headless Chromium browser process on the server to load and capture a screenshot of the {{kib}} app. When installing {{kib}} on Linux and Windows platforms, the Chromium binary comes bundled with the {{kib}} download. For Mac platforms, the Chromium binary is downloaded the first time {{kib}} is started.

`xpack.screenshotting.browser.chromium.disableSandbox`
:   It is recommended that you research the feasibility of enabling unprivileged user namespaces. An exception is if you are running {{kib}} in Docker because the container runs in a user namespace with the built-in seccomp/bpf filters. For more information, refer to [Chromium sandbox](docs-content://deploy-manage/kibana-reporting-configuration.md#reporting-chromium-sandbox). Defaults to `false` for all operating systems except CentOS, Debian, and Red Hat Linux, which use `true`.

`xpack.screenshotting.browser.chromium.proxy.enabled`
:   Enables the proxy for Chromium to use. When set to `true`, you must also specify the `xpack.screenshotting.browser.chromium.proxy.server` setting. Defaults to `false`.

`xpack.screenshotting.browser.chromium.proxy.server`
:   The uri for the proxy server. Providing the username and password for the proxy server via the uri is not supported.

`xpack.screenshotting.browser.chromium.proxy.bypass`
:   An array of hosts that should not go through the proxy server and should use a direct connection instead. Examples of valid entries are "elastic.co", "*.elastic.co", ".elastic.co", ".elastic.co:5601".


### {{kib}} server settings for headless browser connection [reporting-kibana-server-settings]

To generate screenshots for PNG and PDF reports, Reporting opens the {{kib}} web interface using a local connection to the server. In most cases, using a local connection to the {{kib}} server presents no issue. If you prefer the headless browser to connect to {{kib}} using a specific hostname, there are a number of settings that allow the headless browser to connect to {{kib}} through a proxy, rather than directly.

::::{note}
The `xpack.reporting.kibanaServer` settings are optional. Take caution when editing these settings. Adding these settings can cause the PDF/PNG {{report-features}} to fail. If reports fail, inspect the server logs and pay attention to errors regarding the headless browser being unable to connect to the server. The full {{kib}} URL that Reporting is attempting to open is logged during report execution.

::::


`xpack.reporting.kibanaServer.port`
:   The port for accessing {{kib}}.

`xpack.reporting.kibanaServer.protocol`
:   The protocol for accessing {{kib}}, typically `http` or `https`.

$$$xpack-kibanaServer-hostname$$$ `xpack.reporting.kibanaServer.hostname`
:   The hostname for accessing {{kib}}.


### Network policy settings for headless Chromium restrictions [reporting-network-policy]

To generate PDF reports, Reporting uses a headless Chromium browser to fully load the {{kib}} page on the server. This potentially involves sending requests to external hosts. For example, a request might go to an external image server to show a field formatted as an image, or to show an image in a Markdown visualization.

If the headless Chromium browser is asked to send a request that violates the network policy, it will stop processing the page before the request goes out, and the report is marked as a failure. Additional information about the event is in the {{kib}} server logs.

::::{note}
{{kib}} installations are not designed to be publicly accessible over the internet. The Reporting network policy and other capabilities of the Elastic Stack security features do not change this condition.
::::


`xpack.screenshotting.networkPolicy`
:   Capturing a screenshot from a {{kib}} page involves sending out requests for all the linked web assets. For example, a Markdown visualization can show an image from a remote server.

`xpack.screenshotting.networkPolicy.enabled`
:   When `false`, disables the headless browser network policy. Defaults to `true`.

`xpack.screenshotting.networkPolicy.rules`
:   A policy is specified as an array of objects that describe what to allow or deny based on a host or protocol. If a host or protocol is not specified, the rule matches any host or protocol.

The rule objects are evaluated sequentially from the beginning to the end of the array, and continue until there is a matching rule. If no rules allow a request, the request is denied.

```yaml
# Only allow requests to elastic.co
xpack.screenshotting.networkPolicy:
  rules: [ { allow: true, host: "elastic.co" } ]
```

```yaml
# Only allow HTTPS requests to https://elastic.co
xpack.screenshotting.networkPolicy:
  rules: [ { allow: true, host: "elastic.co", protocol: "https:" } ]
```

Example of a baseline configuration for disallowing all requests to external paths:
```yaml
xpack.screenshotting.networkPolicy:
  rules: [ { allow: true, host: "localhost:5601", protocol: "http:" } ]
```
::::{note}
Typically, Chromium will connect to {{kib}} on a local interface, but this may be different based on the environment and specific [headless browser connection settings](#reporting-kibana-server-settings).
::::

A final `allow` rule with no host or protocol allows all requests that are not explicitly denied:

```yaml
# Denies requests from http://elastic.co, but anything else is allowed.
xpack.screenshotting.networkPolicy:
  rules: [{ allow: false, host: "elastic.co", protocol: "http:" }, { allow: true }];
```

A network policy can be composed of multiple rules:

```yaml
# Allow any request to http://elastic.co but for any other host, https is required
xpack.screenshotting.networkPolicy
  rules: [
    { allow: true, host: "elastic.co", protocol: "http:" },
    { allow: true, protocol: "https:" },
  ]
```

::::{note}
The `file:` protocol is always denied, even if no network policy is configured.

::::



## CSV settings [reporting-csv-settings]

::::{note}
We recommend using CSV reports to export moderate amounts of data only. The feature enables analysis of data in external tools, but it is not intended for bulk export or to backup Elasticsearch data. Report timeout and incomplete data issues are likely if you are exporting data where:

* More than 250 MB of data is being exported
* Data is stored on slow storage tiers
* Any shard needed for the search is unavailable
* Network latency between nodes is high
* Cross-cluster search is used
* ES|QL is used and result row count exceeds the limits of ES|QL queries

To work around the limitations, use filters to create multiple smaller reports, or extract the data you need directly with the Elasticsearch APIs.

For more information on using Elasticsearch APIs directly, see [Scroll API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-scroll), [Point in time API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-open-point-in-time), [ES|QL](docs-content://explore-analyze/query-filter/languages/esql-rest.md) or [SQL](docs-content://explore-analyze/query-filter/languages/sql-rest-format.md#_csv) with CSV response data format. We recommend that you use an official Elastic language client: details for each programming language library that Elastic provides are in the [{{es}} Client documentation](https://www.elastic.co/guide/en/elasticsearch/client/index.html).

Reporting parameters can be adjusted to overcome some of these limiting scenarios. Results are dependent on data size, availability, and latency factors and are not guaranteed.

::::

`xpack.reporting.csv.maxConcurrentShardRequests` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Sets the maximum number of concurrent shard requests that each sub-search request executes per node during Kibana CSV export. Defaults to `5`. This setting is available in 8.12.0 and later versions in {{ecloud}}.
% TBD: Is this setting applicable only to Elastic Cloud?

$$$xpack-reporting-csv$$$ `xpack.reporting.csv.maxSizeBytes` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The maximum [byte size](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#byte-units) of a CSV file before being truncated. This setting exists to prevent large exports from causing performance and storage issues. Can be specified as a number of bytes. Defaults to `250mb`.

`xpack.reporting.csv.scroll.size`
:   Number of documents retrieved from {{es}} for each scroll iteration during a CSV export. The maximum value is `10000`. Defaults to `500`.

::::{note}
You may need to lower this setting if the default number of documents creates a strain on network resources.

::::


`xpack.reporting.csv.scroll.duration`
:   Amount of [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) allowed before {{kib}} cleans the scroll context during a CSV export. Valid option is either `auto` or [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units), Defaults to `30s`.

::::{note}
If search latency in {{es}} is sufficiently high, such as if you are using {{ccs}}, you may either need to increase the time setting or set this config value to `auto`. When the config value is set to `auto` the scroll context will be preserved for as long as possible, before the report task is terminated due to the limits of `xpack.reporting.queue.timeout`.

::::


`xpack.reporting.csv.scroll.strategy`
:   Choose the API method used to page through data during CSV export. Valid options are `scroll` and `pit`. Defaults to `pit`.

::::{note}
Each method has its own unique limitations which are important to understand.

* Scroll API: Search is limited to 500 shards at the very most. In cases where data shards are unavailable or time out, the export may return partial data.
* PIT API: Permissions to read data aliases alone will not work: the permissions are needed on the underlying indices or datastreams. In cases where data shards are unavailable or time out, the export will be empty rather than returning partial data.

::::


`xpack.reporting.csv.checkForFormulas`
:   Enables a check that warns you when there’s a potential formula included in the output (=, -, +, and @ chars). See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.escapeFormulaValues`
:   Escape formula values in cells with a `'`. See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.useByteOrderMarkEncoding`
:   Adds a byte order mark (`\ufeff`) at the beginning of the CSV file. Defaults to `false`.

`xpack.reporting.csv.maxRows` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.3`
:    The maximum number of rows in a CSV report. Reports longer than the maximum limit will be truncated. The default is 10,000. The minimum is 1.


