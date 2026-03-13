---
navigation_title: "Background job settings"
applies_to:
  deployment:
    ess: all
    self: all
---

# Background job settings [reporting-job-queue-settings]

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
