---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/apm-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# APM settings in Kibana [apm-settings-kb]

These settings allow the APM app to function, and specify the data that it surfaces. Unless you’ve customized your setup, you do not need to configure any settings to use the APM app. It is enabled by default.

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

## APM indices [apm-indices-settings-kb]

The APM app uses data views to query APM indices. To change the default APM indices that the APM app queries, open the APM app and select **Settings** > **Indices**. Index settings in the APM app take precedence over those set in `kibana.yml`.

APM indices are {{kib}} space-aware; changes to APM index settings will only apply to the currently enabled space.

## General APM settings [general-apm-settings-kb]

If you’d like to change any of the default values, copy and paste the relevant settings into your `kibana.yml` configuration file. Changing these settings may disable features of the APM App.

::::{tip}
More settings are available in the [Observability advanced settings](/reference/advanced-settings.md#observability-advanced-settings).
::::


`xpack.apm.maxSuggestions` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of suggestions fetched in autocomplete selection boxes. Defaults to `100`.

`xpack.apm.serviceMapFingerprintBucketSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of unique transaction combinations sampled for generating service map focused on a specific service. Defaults to `100`.

`xpack.apm.serviceMapFingerprintGlobalBucketSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of unique transaction combinations sampled for generating the global service map. Defaults to `100`.

`xpack.apm.serviceMapEnabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `false` to disable service maps. Defaults to `true`.

`xpack.apm.serviceMapTraceIdBucketSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of trace IDs sampled for generating service map focused on a specific service. Defaults to `65`.

`xpack.apm.serviceMapTraceIdGlobalBucketSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of trace IDs sampled for generating the global service map. Defaults to `6`.

`xpack.apm.serviceMapMaxTracesPerRequest` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of traces per request for generating the global service map. Defaults to `50`.

`xpack.apm.ui.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `false` to hide the APM app from the main menu. Defaults to `true`.

`xpack.apm.ui.maxTraceItems` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of child items displayed when viewing trace details. Defaults to `5000`.

`xpack.observability.annotations.index` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Index name where Observability annotations are stored. Defaults to `observability-annotations`.

`xpack.apm.metricsInterval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Sets a `fixed_interval` for date histograms in metrics aggregations. Defaults to `30`.

`xpack.apm.agent.migrations.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `false` to disable cloud APM migrations. Defaults to `true`.

`xpack.apm.indices.error` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all error indices. Defaults to `logs-apm*,apm-*,traces-*.otel-*`.

`xpack.apm.indices.onboarding` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all onboarding indices. Defaults to `apm-*`.

`xpack.apm.indices.span` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all span indices. Defaults to `traces-apm*,apm-*,traces-*.otel-*`.

`xpack.apm.indices.transaction` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all transaction indices. Defaults to `traces-apm*,apm-*,traces-*.otel-*`.

`xpack.apm.indices.metric` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all metrics indices. Defaults to `metrics-apm*,apm-*,metrics-*.otel-*`.

`xpack.apm.indices.sourcemap` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Matcher for all source map indices. Defaults to `apm-*`.

`xpack.apm.autoCreateApmDataView` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `false` to disable the automatic creation of the APM data view when the APM app is opened. Defaults to `true`.

`xpack.apm.latestAgentVersionsUrl` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies the URL of a self hosted file that contains latest agent versions. Defaults to `https://apm-agent-versions.elastic.co/versions.json`. Set to `''` to disable requesting latest agent versions.
