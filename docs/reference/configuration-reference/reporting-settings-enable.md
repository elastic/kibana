---
navigation_title: "Enable reporting"
applies_to:
  deployment:
    ess: all
    self: all
---

# Enable reporting [general-reporting-settings]

$$$xpack-enable-reporting$$$`xpack.reporting.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   When `true`, enables the {{report-features}}. Set this to `false` to disable {{report-features}} entirely. The default is `true`.

::::{note}
Disabling the {{report-features}} is discouraged. If you need to turn off the ability to generate reports, configure the roles and spaces in the [{{kib}} application privileges](docs-content://deploy-manage/kibana-reporting-configuration.md#grant-user-access).

If needed, you can also prevent a {{kib}} instance from claiming reporting work by setting [`xpack.reporting.queue.pollEnabled: false`](./reporting-settings-background-job.md#xpack-reportingQueue-pollEnabled).
::::
