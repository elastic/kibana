---
mapped_pages:
  - https://www.elastic.co/guide/en/cloud/current/ec-manage-kibana-settings.html#ec-kibana-config
---

# Elastic Cloud Kibana settings [ec-manage-kibana-settings]

## Supported Kibana settings [ec-kibana-config]

### OpenID Connect [ec_openid_connect]

If you are using OpenID Connect to secure your clusters, these settings are supported on {{ech}}.

`xpack.security.authc.providers.oidc.<provider-name>.order`
:   Specifies order of the OpenID Connect authentication provider in the authentication chain.

`xpack.security.authc.providers.oidc.<provider-name>.realm`
:   Specifies which OpenID Connect realm in Elasticsearch should be used.

`xpack.security.authc.providers.oidc.<provider-name>.description`
:   Specifies how OpenID Connect login should be titled in the Login Selector UI.

`xpack.security.authc.oidc.realm`
:   Specifies which OpenID Connect realm in Elasticsearch should be used.

To learn more, check [configuring Kibana to use OpenID Connect](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/openid-connect.md).


### Anonymous authentication [ec_anonymous_authentication]

If you want to allow anonymous authentication in Kibana, these settings are supported on {{ech}}. To learn more on how to enable anonymous access, check [Enabling anonymous access](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/anonymous-access.md) and [Configuring Kibana to use anonymous authentication](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-authentication.md#anonymous-authentication).

#### Supported versions before 8.0.0 [ec_supported_versions_before_8_0_0]

`xpack.security.sessionTimeout`
:   Specifies the session duration in milliseconds. Allows a value between 15000 (15 seconds) and 86400000 (1 day). To learn more, check [Security settings in Kibana](/reference/configuration-reference/security-settings.md). Deprecated in versions 7.6+ and removed in versions 8.0+.


#### All supported versions [ec_all_supported_versions_4]

`xpack.security.authc.anonymous.*`
:   Enables access for the `anonymous` user. In versions prior to 7.10 anonymous access is enabled by default, but you can add this setting if you want to avoid anonymous access being disabled accidentally by a subsequent upgrade.

`xpack.security.authc.providers.anonymous.<provider-name>.order`
:   Specifies order of the anonymous authentication provider in the authentication chain.

`xpack.security.authc.providers.anonymous.<provider-name>.credentials`
:   Specifies which credentials Kibana should use for anonymous users.

### Visualizations [ec_visualizations]



#### Supported versions before 8.0.0 [ec_vis_supported_versions_before_8_0_0]

`vis_type_table.legacyVisEnabled`
:   Starting from version 7.11, a new datatable visualization is used. Set to `true` to enable the legacy version. In version 8.0 and later, the old implementation is removed and this setting is no longer supported.

`vega.enableExternalUrls`
:   Set to `true` to allow Vega vizualizations to use data from sources other than the linked Elasticsearch cluster. In version 8.0 and later, the `vega.enableExternalUrls` is not supported. Use `vis_type_vega.enableExternalUrls` instead.

#### Version 7.7+ [ec_vis_supported_versions_7_7]

`vis_type_vega.enable`
:   For 7.7 version and later, set to `false` to disable Vega vizualizations. **Default: `true`**

#### Version 7.8+ [ec_vis_supported_versions_7_8]

`vis_type_vega.enableExternalUrls`
:   Set this value to `true` to allow Vega to use any URL to access external data sources and images. When `false`, Vega can only get data from {{es}}. **Default: `false`**

### UI Settings [ec_ui_settings]

#### Version 9.4+ [ec_ui_version_9_4]
```{applies_to}
stack: ga 9.4+
```

`uiSettings.globalOverrides.hideAnnouncements`
:   Set to `true` to stop showing messages and tours that highlight new features. **Default: `false`**

`uiSettings.globalOverrides.hideFeedback`
:   Set to `true` to stop showing elements requesting user feedback. **Default: `false`**

## X-Pack configuration settings [ec-xpack-config]

You can configure the following X-Pack settings from the Kibana **User Settings** editor.

### Version 9.3+ [ec_version_9_3]
```{applies_to}
stack: ga 9.3
```

`xpack.actions.email.maximum_body_length`
:    The maximum length of an email body in bytes.  Values longer than this length will be truncated.  The default is 25MB, the maximum is 25MB.

`xpack.fleet.integrationRollbackTTL`
:   Configure the time-to-live (TTL) for integration rollback availability. This setting controls how long the rollback option remains available after an integration is upgraded. The value must be specified in a duration format (for example, `7d`, `14d`, `168h`, or `1w`). Defaults to `7d` (7 days). For more information, refer to [Roll back an integration](docs-content://reference/fleet/roll-back-integration.md).

`xpack.reporting.csv.maxRows`
:    The maximum number of rows in a CSV report. Reports longer than maximum limit will be truncated. The default is 10,000. The minimum is 1.

### Version 9.2+ [ec_version_9_2]
```{applies_to}
stack: ga 9.2
```

`xpack.actions.email.recipient_allowlist`
:    A list of allowed email recipient patterns (`to`, `cc`, or `bcc`) that can be used with email connectors. If you attempt to send an email to a recipient that does not match the allowed patterns, the action will fail. The failure message indicates that the email is not allowed.

`xpack.securitySolution.disableEndpointRuleAutoInstall` {applies_to}`stack: ga 9.2.4+`
:   Set to `true` to disable the automatic installation of Elastic Defend SIEM rules when a new Endpoint integration policy is created. Default is `false`.

### Version 9.1+ [ec_version_9_1]
```{applies_to}
stack: ga 9.1
```

`xpack.actions.email.services.enabled`
:   An array of strings indicating all email services that are enabled. Available options are `elastic-cloud`, `google-mail`, `microsoft-outlook`, `amazon-ses`, `microsoft-exchange`, and `other`. If the array is empty, no email services are enabled. The default value is `["*"]`, which enables all email services.

`xpack.actions.email.services.ses.host`
:   The SMTP endpoint for an Amazon Simple Email Service (SES) service provider that can be used by email connectors.

`xpack.actions.email.services.ses.port`
:   The port number for an Amazon Simple Email Service (SES) service provider that can be used by email connectors.

`xpack.actions.webhook.ssl.pfx.enabled`
:   Disable PFX file support for SSL client authentication. When set to `false`, the application will not accept PFX certificate files and will require separate certificate and private key files instead. Only applies to the [Webhook connector](/reference/connectors-kibana/webhook-action-type.md).

`xpack.banners.linkColor`
:   The color for the banner link text. Defaults to `#0B64DD`.

`xpack.product_intercept.enabled`
:   Enable or disable Elastic product feedback prompts. Defaults to `true`.

`xpack.product_intercept.interval`:
:   Set the time that elapses between Elastic product feedback prompts. The time is formatted as a number and a time unit (d,h,m,s). For example, 20m, 24h, 7d. Defaults to `90d`.

`xpack.fleet.autoUpgrades.taskInterval`:
:   Configure the interval of the automatic upgrade task for {{fleet}}-managed {{agents}}. Defaults to `30m`.

`xpack.fleet.autoUpgrades.retryDelays`:
:   Configure the retry delays of the automatic upgrade task for {{fleet}}-managed {{agents}}. The array's length indicates the maximum number of retries. Defaults to `['30m', '1h', '2h', '4h', '8h', '16h', '24h']`.

`xpack.fleet.fleetPolicyRevisionsCleanup.max_revisions`
: The maximum number of revisions to maintain for a Fleet agent policy. Defaults to `10`.

`xpack.fleet.fleetPolicyRevisionsCleanup.interval`
: The time interval for performing cleanups of Fleet agent policy revisions. The value must be specified in a duration format (for example, `30m`, `1h`, `1d`). Defaults to `1h` (1 hour).

`xpack.fleet.fleetPolicyRevisionsCleanup.max_policies_per_run`
: The maximum number of Fleet agent policies to clean up revisions from per interval. Defaults to `100`.

### Version 8.18+ [ec_version_8_18]

`xpack.fleet.enableManagedLogsAndMetricsDataviews`
:   Allow to disable the automatic creation of global dataviews `logs-*` and `metrics-*`.

### Version 8.16+ [ec_version_8_16]

`xpack.task_manager.capacity`
:   Controls the number of tasks that can be run at one time. Can be minimum 5 and maximum 50. Default: 10.


### Version 8.8+ [ec_version_8_8]

`xpack.cases.files.allowedMimeTypes`
:   The MIME types that you can attach to a case, represented in an array of strings. For example: `['image/tiff','text/csv','application/zip'].` The default MIME types are specified in [mime_types.ts](https://github.com/elastic/kibana/blob/8.16/x-pack/plugins/cases/common/constants/mime_types.ts).

`xpack.cases.files.maxSize`
:   The size limit for files that you can attach to a case, represented as the number of bytes. By default, the limit is 10 MiB for images and 100 MiB for all other MIME types. If you specify a value for this setting, it affects all file types.

`xpack.actions.enableFooterInEmail`
:   A boolean value indicating that a footer with a relevant link should be added to emails sent as alerting actions. Default: true.


### Version 8.7+ [ec_version_8_7]

`xpack.actions.run.maxAttempts`
:   Specifies the maximum number of times an action can be attempted to run. Can be minimum 1 and maximum 10.

`xpack.actions.run.connectorTypeOverrides`
:   Overrides the settings under xpack.actions.run for a connector type with the given ID. For example id:'.server-log', maxAttempts:5.


### Version 8.6+ [ec_version_8_6]

`xpack.task_manager.monitored_stats_health_verbose_log.level`
:   Set to `info` for Task Manager to log the health monitoring stats at info level instead of `debug`. Default: `debug`.


### Version 8.5+ [ec_version_8_5]

`xpack.security.accessAgreement.message`
:   This setting specifies the access agreement text in Markdown format that will be used as the default access agreement for all providers that do not specify a value for `xpack.security.authc.providers.<provider-type>.<provider-name>.accessAgreement.message`.

`xpack.alerting.rules.run.alerts.max`
:   Sets the maximum number of alerts that a rule can generate each time detection checks run. Defaults to `1000`.


### Version 8.3+ [ec_version_8_3]

`xpack.cloudSecurityPosture.enabled`
:   Enables the Kibana UI for Elastic’s Cloud Security Posture solution. The solution provides audit & compliance checks on Cloud & Kubernetes environments. Defaults to `false`.

`xpack.alerting.rules.run.actions.connectorTypeOverrides`
:   Overrides the settings under xpack.alerting.rules.run.actions for a connector type with the given ID. For example id:'.server-log', max:1000.


### Version 8.2+ [ec_version_8_2]

`xpack.alerting.rules.minimumScheduleInterval.value`
:   Specifies the minimum schedule interval for rules. This minimum is applied to all rules created or updated after you set this value. Defaults to `1m`.

`xpack.alerting.rules.minimumScheduleInterval.enforce`
:   Specifies the behavior when a new or changed rule has a schedule interval less than the value defined in `xpack.alerting.rules.minimumScheduleInterval.value`. If `false`, rules with schedules less than the interval will be created but warnings will be logged. If `true`, rules with schedules less than the interval cannot be created. Default: `false`.

`xpack.alerting.rules.run.actions.max`
:   Sets the maximum number of actions that a rule can trigger each time detection checks run (maximum `100000`).

`xpack.alerting.rules.run.timeout`
:   Specifies the default timeout for the all rule types tasks.

`xpack.alerting.rules.run.ruleTypeOverrides`
:   Overrides the settings under xpack.alerting.rules.run for a rule type with the given id. e.g. (id:'index-threshold', timeout:'5m'),

#### Version 8.1+ [ec_version_8_1]

`xpack.alerting.cancelAlertsOnRuleTimeout`
:   Set to `false` to enable writing alerts and scheduling actions even if rule execution is cancelled due to timeout. Defaults to `true`.



### Version 8.0+ [ec_version_8_0]

`xpack.endpoint.enabled`
:   Set to `true` to enable the Endpoint application.

`xpack.fleet.enabled`
:   Set to `false` to disable the Fleet application. Also enables the EPM and Agents features. For details about using this application, check the blog post [Easier data onboarding with Elastic Agent and Ingest Manager](https://www.elastic.co/blog/introducing-elastic-agent-and-ingest-manager).

`xpack.fleet.agents.enabled`
:   Set to `false` to disable the Agents API & UI.

`xpack.ruleRegistry.write.disabledRegistrationContexts`
:   Specifies the observability alert indices that are disabled to be written. Data type is array. Allowed values are: [ *observability.logs*,*observability.metrics*,*observability.apm*,*observability.uptime* ]


### Version 7.17.4+, 8.3+ [ec_version_7_17_4_8_3]

`xpack.actions.email.domain_allowlist`
:   A list of allowed email domains which can be used with the email connector. When this setting is not used, all email domains are allowed. When this setting is used, if any email is attempted to be sent that (a) includes an addressee with an email domain that is not in the allowlist, or (b) includes a from address domain that is not in the allowlist, it will fail with a message indicating the email is not allowed.

::::{note}
This setting is not available in versions 8.0.0 through 8.2.0. As such, this setting should be removed before upgrading from 7.17 to 8.0, 8.1 or 8.2. It is possible to configure the settings in 7.17.4 and then upgrade to 8.3.0 directly.
::::



### Version 7.17.2+, 8.2+ [ec_version_7_17_2_8_2]

`xpack.task_manager.event_loop_delay.monitor`
:   Enables event loop delay monitoring, which will log a warning when a task causes an event loop delay which exceeds the `warn_threshold` setting.  Defaults to true.

    ::::{note}
    This setting is not available in versions 8.0.0 through 8.1.1.
    ::::


`xpack.task_manager.event_loop_delay.warn_threshold`
:   Sets the amount of event loop delay during a task execution which will cause a warning to be logged. Defaults to 5000 milliseconds (5 seconds).

    ::::{note}
    This setting is not available in versions 8.0.0 through 8.1.1. As such, this setting should be removed before upgrading from 7.17 to 8.0 or 8.1.0. It is possible to configure the settings in 7.17.2 and then upgrade to 8.2.0 directly.
    ::::



### All supported versions [ec_all_supported_versions_5]

`xpack.alerting.defaultRuleTaskTimeout`
:   Specifies the default timeout for the all rule types tasks. Defaults to `5m`. Deprecated in versions 8.2+ and removed in versions 9.0+.

`xpack.actions.microsoftGraphApiUrl`
:   Specifies the URL to the Microsoft Graph server when using the MS Exchange Server email service. Defaults to `https://graph.microsoft.com/v1.0`.

`xpack.alerting.maxEphemeralActionsPerAlert`
:   Sets the number of actions that will be executed ephemerally. Defaults to `10`.

`xpack.task_manager.ephemeral_tasks.enabled`
:   Enables an experimental feature that executes a limited (and configurable) number of actions in the same task as the alert which triggered them. These action tasks reduce the latency of the time it takes an action to run after it’s triggered, but are not persisted as SavedObjects. These non-persisted action tasks have a risk that they won’t be run at all if the Kibana instance running them exits unexpectedly. Defaults to `false`.

`xpack.task_manager.ephemeral_tasks.request_capacity`
:   Sets the size of the ephemeral queue. Defaults to `10`.

`xpack.actions.customHostSettings`
:   An array of objects, one per host, containing the SSL/TLS settings used when executing connectors which make HTTPS and SMTP connections to the host servers.  For details about using this setting, check [Alerting and action settings in Kibana](/reference/configuration-reference/alerting-settings.md).

`xpack.actions.ssl.proxyVerificationMode`
:   Controls the verification of the proxy server certificate that hosted-ems receives when making an outbound SSL/TLS connection to the host server. Valid values are `full`, `certificate`, and `none`. Use `full` to perform hostname verification, `certificate` to skip hostname verification, and `none` to skip verification. Default: `full`.

`xpack.actions.ssl.verificationMode`
:   Controls the verification of the server certificate that hosted-ems receives when making an outbound SSL/TLS connection to the host server. Valid values are `full`, `certificate`, and `none`. Use `full` to perform hostname verification, `certificate` to skip hostname verification, and `none` to skip verification. Default: `full`.

`xpack.task_manager.monitored_stats_health_verbose_log.enabled`
:   Enable to allow the Kibana task manager to log at either a warning or error log level if it self-detects performance issues. Default: `false`.

`xpack.task_manager.monitored_stats_health_verbose_log.warn_delayed_task_start_in_seconds`
:   The number of seconds we allow a task to delay before printing a warning server log. Default: `60`.

`xpack.actions.preconfiguredAlertHistoryEsIndex`
:   Set to `true` to enable experimental Alert history Elasticsearch index connector. Default: `false`.

`xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled`
:   Set to `true` to enable the "explore underlying data" menu action in dashboards. Default: `false`.

`xpack.actions.proxyBypassHosts`
:   Specifies hostnames which should not use the proxy, if using a proxy for actions. The value is an array of hostnames as strings.  By default, all hosts will use the proxy.  The settings `xpack.actions.proxyBypassHosts` and `xpack.actions.proxyOnlyHosts` cannot be used at the same time.

`xpack.actions.proxyOnlyHosts`
:   Specifies hostnames which should only be used with the proxy, if using a proxy for actions. The value is an array of hostnames as strings.  By default, all hosts will use the proxy.  The settings `xpack.actions.proxyBypassHosts` and `xpack.actions.proxyOnlyHosts` cannot be used at the same time.

`xpack.actions.maxResponseContentLength`
:   Specifies the max number of bytes of the HTTP response for requests to external resources. Defaults to *1mb*.

`xpack.actions.responseTimeout`
:   Specifies the time allowed for requests to external resources. Requests that take longer are aborted. The time is formatted as <count>[ms|s|m|h|d|w|M|Y], for example, *20m*, *24h*, *7d*, *1w*. Defaults to *60s*.

`xpack.task_manager.monitored_task_execution_thresholds`
:   Specifies the thresholds for failed task executions. If the percentage of failed executions exceeds the specified thresholds, the health of the task will be reported as configured. Can be specified at a default level or a custom level for specific task types. The following example shows a valid `monitored_task_execution_thresholds configuration`.

    ```yaml
    xpack.task_manager.monitored_task_execution_thresholds:
      default:
        error_threshold: 70
        warn_threshold: 50
      custom:
        "alerting:.index-threshold":
          error_threshold: 50
          warn_threshold: 0
    ```


`xpack.task_manager.version_conflict_threshold`
:   Specifies the threshold for version conflicts. If the percentage of version conflicts exceeds the threshold, the task manager `poll_interval` will automatically be adjusted. Default: `80`.

`xpack.actions.proxyUrl`
:   Specifies the proxy URL to use, if using a proxy for actions.

`xpack.actions.proxyHeaders`
:   Specifies headers for proxy, if using a proxy for actions.

`xpack.ingestManager.enabled`
:   Set to `false` to disable the Ingest Manager application. Also enables the EPM and Fleet features. For details about using this application, check the blog post [Easier data onboarding with Elastic Agent and Ingest Manager](https://www.elastic.co/blog/introducing-elastic-agent-and-ingest-manager).

`xpack.ingestManager.fleet.enabled`
:   Set to `false` to disable the Fleet API & UI.

`xpack.lists.maxImportPayloadBytes`
:   Sets the number of bytes (default `9000000`, maximum `100000000`) allowed for uploading Security Solution value lists. For every 10 megabytes, it is recommended to have an additional 1 gigabyte of RAM reserved for Kibana. For example, on a Kibana instance with 2 gigabytes of RAM, you can set this value up to 20000000 (20 megabytes).

`xpack.lists.importBufferSize`
:   Sets the buffer size used for uploading Security Solution value lists (default `1000`). Change the value if you are experiencing slow upload speeds or larger than wanted memory usage when uploading value lists. Set to a higher value to increase throughput at the expense of using more Kibana memory, or a lower value to decrease throughput and reduce memory usage.

`xpack.security.sameSiteCookies`
:   Sets the `SameSite` attribute of `Set-Cookie` HTTP header. It allows you to declare whether your cookie should be restricted to a first-party or same-site context. **Not set** by default, which makes modern browsers treat it as `Lax`. If you use Kibana embedded in an iframe in modern browsers, you might need to set it to `None`. Note that `None` usage requires secure context: `xpack.security.secureCookies: true`. Some old versions of IE11 do not support `SameSite: None`, so you should not specify `xpack.security.sameSiteCookies` at all.

`xpack.ingestManager.enabled`
:   Set to `true` (default `false`) to enable the Ingest Manager application. Also enables the EPM and Fleet features. For details about using this application, check the blog post [Easier data onboarding with Elastic Agent and Ingest Manager](https://www.elastic.co/blog/introducing-elastic-agent-and-ingest-manager).

`xpack.ingestManager.epm.enabled`
:   Set to `true` (default) to enable the EPM API & UI.

`xpack.ingestManager.fleet.enabled`
:   Set to `true` (default) to enable the Fleet API & UI.

`xpack.task_manager.max_workers`
:   Specify the maximum number of tasks a Kibana will run concurrently. Default: `10`. Deprecated in versions 8.16+

`xpack.task_manager.poll_interval`
:   Specify how often, in milliseconds, a Kibana should check for more tasks. Default: `3000`.

`xpack.eventLog.logEntries`
:   Set to `true` to enable logging event log documents from alerting to the Kibana log, in addition to being indexed into the event log index. Default: `false`.

`xpack.security.session.idleTimeout`
:   Set the session duration. The format is a string of `count` and `unit`, where unit is one of `ms`,`s`,`m`,`h`,`d`,`w`,`M`,`Y`. For example, `70ms`, `5s`, `3d`, `1Y`. To learn more, check [Security settings in Kibana](/reference/configuration-reference/security-settings.md).

`xpack.security.session.lifespan`
:   Sets the maximum duration, also known as "absolute timeout". After this duration, the session will expire even if it is not idle. To learn more, check [Security settings in Kibana](/reference/configuration-reference/security-settings.md).

`xpack.maps.showMapVisualizationTypes`
:   Set to `true` if you want to create new region map visualizations.

`xpack.actions.allowedHosts`
:   Set to an array of host names which actions such as email, slack, pagerduty, and webhook can connect to.  An element of `*` indicates any host can be connected to.  An empty array indicates no hosts can be connected to.  Default: `[ * ]`

`xpack.actions.enabledActionTypes`
:   Set to an array of action types that are enabled.  An element of `*` indicates all action types registered are enabled.  The action types provided by Kibana are: `.server-log`, `.slack`, `.email`, `.index`, `.pagerduty`, `.webhook`. Default: `[ * ]`

`xpack.grokdebugger.enabled`
:   Set to `true` (default) to enable the Grok Debugger.

`xpack.graph.enabled`
:   Set to `false` to disable X-Pack graph.

`xpack.monitoring.cluster_alerts.email_notifications.email_address`
:   When enabled, specifies the email address to receive cluster alert notifications.

`xpack.monitoring.kibana.collection.interval`
:   Controls [how often data samples are collected](elasticsearch://reference/elasticsearch/configuration-reference/monitoring-settings.md#monitoring-collection-settings).

`xpack.monitoring.min_interval_seconds`
:   Specifies the minimum number of seconds that a time bucket in a chart can represent. If you modify the `xpack.monitoring.kibana.collection.interval`, use the same value in this setting.

`xpack.monitoring.ui.container.elasticsearch.enabled`
:   For Elasticsearch clusters that run in containers, enables the `Node Listing` to display the `CPU utilization` based on the `Cgroup statistics`, and adds the `Cgroup CPU utilization` to the Node Overview page instead of the overall operating system CPU utilization.

`xpack.ml.enabled`
:   Set to true (default) to enable machine learning.

    If set to `false` in `kibana.yml`, the machine learning icon is hidden in this Kibana instance. If `xpack.ml.enabled` is set to `true` in `elasticsearch.yml`, however, you can still use the machine learning APIs. To disable machine learning entirely, check the [Elasticsearch Machine Learning Settings](elasticsearch://reference/elasticsearch/configuration-reference/machine-learning-settings.md).


#### Content security policy configuration [ec_content_security_policy_configuration]

`csp.script_src`
:   Add sources for the [Content Security Policy `script-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src). When [`csp.strict`](#csp-strict) is `true`, `csp.script_src` may not be `unsafe-inline`. Rules may not contain `nonce-*` or `none` and will not override the defaults. **Default: [`'unsafe-eval'`, `'self'`]**

`csp.worker_src`
:   Add sources for the [Content Security Policy `worker-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src). Rules may not contain `nonce-*` or `none` and will not override the defaults. **Default: [`blob:`, `'self'`]**

`csp.style_src`
:   Add sources for the [Content Security Policy `style-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src). Rules may not contain `nonce-*` or `none` and will not override the defaults. **Default: [`'unsafe-inline'`, `'self'`]**

`csp.connect_src`
:   Add sources for the [Content Security Policy `connect-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/connect-src).

`csp.default_src`
:   Add sources for the [Content Security Policy `default-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/default-src).

`csp.font_src`
:   Add sources for the [Content Security Policy `font-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/font-src).

`csp.frame_src`
:   Add sources for the [Content Security Policy `frame-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-src).

`csp.img_src`
:   Add sources for the [Content Security Policy `img-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/img-src).

`csp.object_src` {applies_to}`stack: ga 9.3`
:   Add sources for the [Content Security Policy `object-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/object-src).

`csp.report_uri`
:   Add sources for the [Content Security Policy `report-uri` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri).

`csp.report_only.form_action`
:   Add sources for the [Content Security Policy `form-action` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/form-action) in reporting mode.

$$$csp-strict$$$ `csp.strict`
:   Blocks Kibana access to any browser that does not enforce even rudimentary CSP rules. In practice, this disables support for older, less safe browsers like Internet Explorer. **Default: `true`** To learn more, check [Configure Kibana](/reference/configuration-reference/general-settings.md)].

`csp.warnLegacyBrowsers`
:   Shows a warning message after loading Kibana to any browser that does not enforce even rudimentary CSP rules, though Kibana is still accessible. This configuration is effectively ignored when [`csp.strict`](#csp-strict) is enabled. **Default: `true`**

`csp.disableUnsafeEval` {applies_to}`stack: preview`
:   Set this to `true` to remove the [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_eval_expressions) source expression from the `script-src` directive. **Default: `false`**

    By enabling `csp.disableUnsafeEval`, Kibana will use a custom version of the Handlebars template library which doesn’t support [inline partials](https://handlebarsjs.com/guide/partials.md#inline-partials). Handlebars is used in various locations in the Kibana frontend where custom templates can be supplied by the user when for instance setting up a visualisation. If you experience any issues rendering Handlebars templates after turning on `csp.disableUnsafeEval`, or if you rely on inline partials, please revert this setting to `false` and [open an issue](https://github.com/elastic/kibana/issues/new/choose) in the Kibana GitHub repository.



#### Permissions policy configuration [ec_permissions_policy_configuration]

`permissionsPolicy.report_to`
:   Add sources for the permissions policy `report-to` directive. To learn more, see [Configure Kibana](/reference/configuration-reference/general-settings.md#server-securityResponseHeaders-permissionsPolicy)


#### Banner settings [ec_banner_settings]

Banners are disabled by default. You need to manually configure them in order to use the feature.

`xpack.banners.placement`
:   Set to `top` to display a banner above the Elastic header. Defaults to `disabled`.

`xpack.banners.textContent`
:   The text to display inside the banner, either plain text or Markdown.

`xpack.banners.textColor`
:   The color for the banner text. Defaults to `#8A6A0A`.

`xpack.banners.backgroundColor`
:   The color of the banner background. Defaults to `#FFF9E8`.

`xpack.banners.disableSpaceBanners`
:   If true, per-space banner overrides are disabled. Defaults to `false`.




## Reporting settings [ec_reporting_settings]

### Version 8.13.0+ [ec_version_8_13_0]

`xpack.reporting.csv.scroll.strategy`
:   Choose the API method used to page through data during CSV export. Valid options are `scroll` and `pit`. Defaults to `pit`.

::::{note}
Each method has its own unique limitations which are important to understand.

* Scroll API: Search is limited to 500 shards at the very most. In cases where data shards are unavailable or time out, the export may return partial data.
* PIT API: Permissions to read data aliases alone will not work. The permissions are needed on the underlying indices or data streams. In cases where data shards are unavailable or time out, the export will be empty instead of returning partial data.

::::


`xpack.reporting.csv.scroll.duration`
:   Amount of [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) allowed before {{kib}} cleans the scroll context during a CSV export. Valid option is either `auto` or [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units), Defaults to `30s`.

::::{note}
Support for the The option `auto` was included here, when the config value is set to `auto` the scroll context will be preserved for as long as is possible, before the report task is terminated due to the limits of `xpack.reporting.queue.timeout`.

::::



### All supported versions [ec_all_supported_versions_6]

`xpack.reporting.enabled`
:   Set to `false` to completely disable reporting.

`xpack.reporting.queue.timeout`
:   Specifies the time each worker has to produce a report. If your machine is slow or under heavy load, you might need to increase this timeout. Specified in milliseconds (number) or duration (string). Duration is a string value formatted as <count>[ms|s|m|h|d|w|M|Y], for example, *20m*, *24h*, *7d*, *1w*.

    Defaults to `120000` (2 minutes)


`xpack.reporting.capture.maxAttempts`
:   Specifies how many retries to attempt in case of occasional failures.

    Defaults to `3`.


`xpack.screenshotting.capture.timeouts.openUrl`
:   Specify how long to allow the Reporting browser to wait for the "Loading…" screen to dismiss and find the initial data for the Kibana page.  If the time is exceeded, a page screenshot is captured showing the current state, and the download link shows a warning message.

    Defaults to `30000` (30 seconds).


`xpack.screenshotting.capture.timeouts.waitForElements`
:   Specify how long to allow the Reporting browser to wait for all visualization panels to load on the Kibana page. If the time is exceeded, a page screenshot is captured showing the current state, and the download link shows a warning message.

    Defaults to `30000` (30 seconds).


`xpack.screenshotting.capture.timeouts.renderComplete`
:   Specify how long to allow the Reporting browser to wait for all visualizations to fetch and render the data. If the time is exceeded, a page screenshot is captured showing the current state, and the download link shows a warning message.

    Defaults to `30000` (30 seconds).


`xpack.screenshotting.capture.browser.type`
:   Specifies the browser to use to capture screenshots. Valid options are `phantom` and `chromium`.

    Beginning with version 7.0, `chromium` is the only allowed option. Defaults to `phantom` for earlier versions.


`xpack.reporting.csv.maxSizeBytes`
:   Sets the maximum size of a CSV file before being truncated. This setting exists to prevent large exports from causing performance and storage issues. Until 7.15, maximum allowed value is 50 MB (52428800 Bytes).

    Defaults to `250MB`. {{stack}} versions before 8.10 default to `10485760` (10MB).


`xpack.reporting.encryptionKey`
:   Set to any text string. To provide your own encryption key for reports, use this setting.

`xpack.reporting.roles.enabled`
:   When `true`, grants users access to the {{report-features}} when they are assigned the `reporting_user` role. Granting access to users this way is deprecated. Set to `false` and use [Kibana privileges](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges.md) instead.

Defaults to `true`.

`xpack.reporting.csv.scroll.duration`
:   Amount of [time](elasticsearch://reference/elasticsearch/rest-apis/api-conventions.md#time-units) allowed before {{kib}} cleans the scroll context during a CSV export.

Defaults to `30s` (30 seconds).

::::{note}
If search latency in {{es}} is sufficiently high, such as if you are using cross-cluster search or frozen tiers, you may need to increase the setting.

::::


`xpack.reporting.csv.scroll.size`
:   Sets the number of documents retrieved from {{es}} for each scroll iteration during Kibana CSV export. Defaults to `500`.

`xpack.reporting.csv.checkForFormulas`
:   Enables a check that warns you when there’s a potential formula included in the output (=, -, +, and @ chars). See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.escapeFormulaValues`
:   Escapes formula values in cells with a `'`. See OWASP: [https://www.owasp.org/index.php/CSV_Injection](https://www.owasp.org/index.php/CSV_Injection). Defaults to `true`.

`xpack.reporting.csv.useByteOrderMarkEncoding`
:   Adds a byte order mark (`\ufeff`) at the beginning of the CSV file. Defaults to `false`.



## Logging and audit settings [ec_logging_and_audit_settings]

::::{note}
To change logging settings or to enable auditing you must first [enable deployment logging](docs-content://deploy-manage/monitor/stack-monitoring/ece-ech-stack-monitoring.md).
::::


The following logging settings are supported:

### Version 8.0+ [ec_version_8_0_2]

`logging.root.level`
:   Can be used to adjust Kibana’s logging level. Allowed values are `fatal`, `error`, `warn`, `info`, `debug`, `trace`, and `all`. Setting this to `all` causes all events to be logged, including system usage information, all requests, and Elasticsearch queries. This has a similar effect to enabling both `logging.verbose` and `elasticsearch.logQueries` in older 7.x versions. Setting to `error` has a similar effect to enabling `logging.quiet` in older 7.x versions. Defaults to `info`.

`xpack.security.audit.enabled`
:   When set to *true*, audit logging is enabled for security events. Defaults to *false*.


### Supported 7.x versions [ec_supported_7_x_versions]

`xpack.security.audit.appender.type`
:   When set to *"rolling-file"* and `xpack.security.audit.enabled` is set to *true*, Kibana ECS audit logs are enabled. Beginning with version 8.0, this setting is no longer necessary for ECS audit log output; it’s only necessary to set `xpack.security.audit.enabled` to `true`

`logging.verbose`
:   If set to *true*, all events are logged, including system usage information and all requests. Defaults to *false*.

`logging.quiet`
:   If set to *true*, all logging output other than error messages is suppressed. Defaults to *false*.

`elasticsearch.logQueries`
:   When set to *true*, queries sent to Elasticsearch are logged (requires `logging.verbose` set to *true*). Defaults to *false*.

`xpack.security.audit.enabled`
:   When set to *true*, audit logging is enabled for security events. Defaults to *false*.


### All supported versions [ec_all_supported_versions_7]

`xpack.security.audit.ignore_filters`
:   List of filters that determine which audit events should be excluded from the ECS audit log.

`xpack.security.audit.ignore_filters.actions`
:   List of values matched against the `event.action` field of an audit event.

`xpack.security.audit.ignore_filters.categories`
:   List of values matched against the `event.category` field of an audit event.

`xpack.security.audit.ignore_filters.outcomes`
:   List of values matched against the `event.outcome` field of an audit event.

`xpack.security.audit.ignore_filters.spaces`
:   List of values matched against the `kibana.space_id` field of an audit event. This represents the space id in which the event took place.

`xpack.security.audit.ignore_filters.types`
:   List of values matched against the `event.type` field of an audit event.


### Version 8.15.0+ [ec_version_8_15_0]

`xpack.security.audit.ignore_filters.users`
:   List of values matched against the `user.name` field of an audit event. This represents the username associated with the audit event.



## APM [ec_apm]

The following APM settings are supported in Kibana:

### Version 8.0.0+ [ec_version_8_0_0_2]

`xpack.apm.autoCreateApmDataView`
:   Set to `false` to disable the automatic creation of the APM data view when the APM app is opened. Defaults to `true`. This setting was called `xpack.apm.autocreateApmIndexPattern` in versions prior to 8.0.0.


### Version 7.16.0 to 8.6.2 [ec_version_7_16_0_to_8_6_2]

`xpack.apm.ui.transactionGroupBucketSize`
:   Number of top transaction groups displayed in the APM app. Defaults to `1000`.


### Version 7.16.0 to 8.0.0 [ec_version_7_16_0_to_8_0_0]

`xpack.apm.maxServiceEnvironments`
:   Maximum number of unique service environments recognized by the UI. Defaults to `100`.


### Supported versions before 8.x [ec_supported_versions_before_8_x_2]

`xpack.apm.autocreateApmIndexPattern`
:   Set to `false` to disable the automatic creation of the APM data view when the APM app is opened. Defaults to `true`. This setting is renamed to `xpack.apm.autoCreateApmDataView` in version 8.0.0.


### All supported versions [ec_all_supported_versions_8]

`xpack.apm.serviceMapFingerprintBucketSize`
:   Maximum number of unique transaction combinations sampled for generating service map focused on a specific service. Defaults to `100`.

`xpack.apm.serviceMapFingerprintGlobalBucketSize`
:   Maximum number of unique transaction combinations sampled for generating the global service map. Defaults to `100`.

`xpack.apm.serviceMapEnabled`
:   Set to `false` to disable service maps. Defaults to `true`.

`xpack.apm.serviceMapTraceIdBucketSize`
:   Maximum number of trace IDs sampled for generating service map focused on a specific service. Defaults to `65`.

`xpack.apm.serviceMapTraceIdGlobalBucketSize`
:   Maximum number of trace IDs sampled for generating the global service map. Defaults to `6`.

`xpack.apm.serviceMapMaxTracesPerRequest`
:   Maximum number of traces per request for generating the global service map. Defaults to `50`.

`xpack.observability.annotations.index`
:   Index name where Observability annotations are stored. Defaults to `observability-annotations`.

`xpack.apm.metricsInterval`
:   Sets a `fixed_interval` for date histograms in metrics aggregations. Defaults to `30`.

`xpack.apm.agent.migrations.enabled`
:   Set to `false` to disable cloud APM migrations. Defaults to `true`.

`xpack.apm.indices.span`
:   Matcher for indices containing span documents. Defaults to apm-*.

`xpack.apm.indices.error`
:   Matcher for indices containing error documents. Defaults to apm-*.

`xpack.apm.indices.transaction`
:   Matcher for indices containing transaction documents. Defaults to apm-*.

`xpack.apm.indices.onboarding`
:   Matcher for all onboarding indices. Defaults to apm-*.

`xpack.apm.indices.metric`
:   Matcher for all metrics indices. Defaults to apm-*.

`xpack.apm.indices.sourcemap`
:   Matcher for all source map indices. Defaults to apm-*.

`xpack.apm.maxSuggestions`
:   Maximum number of suggestions fetched in autocomplete selection boxes. Defaults to `100`

`xpack.apm.searchAggregatedTransactions`
:   Whether to use metric instead of transaction documents to render the UI. Available options are `always`, `never` or `auto`. Defaults to `auto`.

`xpack.apm.ui.maxTraceItems`
:   Maximum number of child items displayed when viewing trace details.

    Defaults to `1000`.  Any positive value is valid. To learn more, check [APM settings in Kibana](/reference/configuration-reference/apm-settings.md).


`xpack.apm.ui.enabled`
:   Set to `false` to disable X-Pack APM UI.



