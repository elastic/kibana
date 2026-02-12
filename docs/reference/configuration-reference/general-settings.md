---
navigation_title: General settings
applies_to:
  deployment:
    ess: all
    self: all
---

# General settings in {{kib}}

:::{note}
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
:::

`console.ui.enabled`
:   Toggling this causes the server to regenerate assets on the next startup, which may cause a delay before pages start being served. Set to `false` to disable Console. **Default: `true`**

`csp.script_src`
:   Add sources for the [Content Security Policy `script-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src).

`csp.disableUnsafeEval`
:   Deprecated in 8.7.0. Use `csp.script_src: ['unsafe-eval']` instead if you wish to enable `unsafe-eval`. This config option will have no effect in a future version.
    Set this to `false` to add the [`unsafe-eval`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_eval_expressions) source expression to the `script-src` directive. **Default: `true`**

    When `csp.disableUnsafeEval` is set to `true`, Kibana will use a custom version of the Handlebars template library. Handlebars is used in various locations in the Kibana frontend where custom templates can be supplied by the user when for instance setting up a visualisation. If you experience any issues rendering Handlebars templates, please set this setting to `false` and [open an issue](https://github.com/elastic/kibana/issues/new/choose) in the Kibana GitHub repository.

`csp.worker_src`
:   Add sources for the [Content Security Policy `worker-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/worker-src).

`csp.style_src`
:   Add sources for the [Content Security Policy `style-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/style-src).

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

`csp.frame_ancestors`
:   Add sources for the [Content Security Policy `frame-ancestors` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/frame-ancestors).

    ::::{note}
    The `frame-ancestors` directive can also be configured by using [`server.securityResponseHeaders.disableEmbedding`](#server-securityResponseHeaders-disableEmbedding). In that case, that takes precedence and any values in `csp.frame_ancestors` are ignored.
    ::::


`csp.report_only.form_action`
:   Add sources for the [Content Security Policy `form-action` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/form-action) in reporting mode.

`csp.report_only.object_src`
:   Add sources for the [Content Security Policy `object-src` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/object-src) in reporting mode.

    :::{note}
    :applies_to: stack: deprecated 9.3
    This setting is deprecated in favor of `csp.object_src`.
    :::

`csp.report_uri`
:   Add sources for the [Content Security Policy `report-uri` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-uri).

`csp.report_to:`
:   Add sources for the [Content Security Policy `report-to` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/report-to).

$$$csp-strict$$$ `csp.strict`
:   Blocks {{kib}} access to any browser that does not enforce even rudimentary CSP rules. In practice, this disables support for older, less safe browsers like Internet Explorer.

% For more information, refer to [Content Security Policy](docs-content://deploy-manage/security/using-kibana-with-security.md.md#csp-strict-mode). **Default: `true`**

`csp.warnLegacyBrowsers`
:   Shows a warning message after loading {{kib}} to any browser that does not enforce even rudimentary CSP rules, though {{kib}} is still accessible. This configuration is effectively ignored when [`csp.strict`](#csp-strict) is enabled. **Default: `true`**

`data.autocomplete.valueSuggestions.terminateAfter` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies the max number of documents loaded by each shard to generate autocomplete suggestions. The default is 100000. Allowed values are between 1 and 10000000.
% TBD: Applicable only to Elastic Cloud?

`data.autocomplete.valueSuggestions.timeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies the time in milliseconds to wait for autocomplete suggestions from Elasticsearch. The default is 1000. Allowed values are between 1 and 1200000.
% TBD: Applicable only to Elastic Cloud?

$$$elasticsearch-maxSockets$$$ `elasticsearch.maxSockets` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The maximum number of sockets that can be used for communications with {{es}}. **Default: `Infinity`**
    It is available in {{ecloud}} 8.2.0 and later versions.

$$$elasticsearch-maxResponseSize$$$ `elasticsearch.maxResponseSize`
:   Either `false` or a `byteSize` value. When set, responses from {{es}} with a size higher than the defined limit will be rejected. This is intended to be used as a circuit-breaker mechanism to avoid memory errors in case of unexpectedly high responses coming from {{es}}. **Default: `false`**

$$$elasticsearch-maxIdleSockets$$$ `elasticsearch.maxIdleSockets`
:   The maximum number of idle sockets to keep open between {{kib}} and {{es}}. If more sockets become idle, they will be closed. **Default: `256`**

$$$elasticsearch-idleSocketTimeout$$$ `elasticsearch.idleSocketTimeout`
:   The timeout for idle sockets kept open between {{kib}} and {{es}}. If the socket is idle for longer than this timeout, it will be closed. If you have a transparent proxy between {{kib}} and {{es}} be sure to set this value lower than or equal to the proxy’s timeout. **Default: `60s`**

`elasticsearch.customHeaders`
:   Header names and values to send to {{es}}. Any custom headers cannot be overwritten by client-side headers, regardless of the [`elasticsearch.requestHeadersWhitelist`](#elasticsearch-requestHeadersWhitelist) configuration. **Default: `{}`**

$$$elasticsearch-hosts$$$ `elasticsearch.hosts:`
:   The URLs of the {{es}} instances to use for all your queries. All nodes listed here must be on the same cluster. **Default: `[ "http://localhost:9200" ]`**

    To enable SSL/TLS for outbound connections to {{es}}, use the `https` protocol in this setting.


$$$elasticsearch-publicBaseUrl$$$ `elasticsearch.publicBaseUrl:`
:   The URL through which Elasticsearch is publicly accessible, if any. This will be shown to users in Kibana when they need connection details for your Elasticsearch cluster.

$$$elasticsearch-pingTimeout$$$ `elasticsearch.pingTimeout`
:   Time in milliseconds to wait for {{es}} to respond to pings. **Default: the value of the [`elasticsearch.requestTimeout`](#elasticsearch-requestTimeout) setting**

$$$elasticsearch-requestHeadersWhitelist$$$ `elasticsearch.requestHeadersWhitelist`
:   List of {{kib}} client-side headers to send to {{es}}. To send **no** client-side headers, set this value to [] (an empty list). Removing the `authorization` header from being whitelisted means that you cannot use [basic authentication](docs-content://deploy-manage/users-roles/cluster-or-deployment-auth/kibana-authentication.md#basic-authentication) in {{kib}}. **Default: `[ 'authorization', 'es-client-authentication' ]`**

$$$elasticsearch-requestTimeout$$$ `elasticsearch.requestTimeout`
:   Time in milliseconds to wait for responses from the back end or {{es}}. This value must be a positive integer. **Default: `30000`**

`elasticsearch.shardTimeout`
:   Time in milliseconds for {{es}} to wait for responses from shards. Set to 0 to disable. **Default: `30000`**

`elasticsearch.compression` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Specifies whether {{kib}} should use compression for communications with {{es}}.
    **Default: `false`**
    It is available in {{ecloud}} 8.3.0 and later versions.

`elasticsearch.sniffInterval`
:   Time in milliseconds between requests to check {{es}} for an updated list of nodes. **Default: `false`**

`elasticsearch.sniffOnStart`
:   Attempt to find other {{es}} nodes on startup. **Default: `false`**

`elasticsearch.sniffOnConnectionFault`
:   Update the list of {{es}} nodes immediately following a connection fault. **Default: `false`**

$$$elasticsearch-ssl-alwaysPresentCertificate$$$ `elasticsearch.ssl.alwaysPresentCertificate`
:   Controls {{kib}} behavior in regard to presenting a client certificate when requested by {{es}}. This setting applies to all outbound SSL/TLS connections to {{es}}, including requests that are proxied for end users. **Default: `false`**

    ::::{warning}
    When {{es}} uses certificates to authenticate end users with a PKI realm and [`elasticsearch.ssl.alwaysPresentCertificate`](#elasticsearch-ssl-alwaysPresentCertificate) is `true`, proxied requests may be executed as the identity that is tied to the {{kib}} server.
    ::::


$$$elasticsearch-ssl-cert-key$$$ `elasticsearch.ssl.certificate` and `elasticsearch.ssl.key`
:   Paths to a PEM-encoded X.509 client certificate and its corresponding private key. These are used by {{kib}} to authenticate itself when making outbound SSL/TLS connections to {{es}}. For this setting to take effect, the `xpack.security.http.ssl.client_authentication` setting in {{es}} must be also be set to `"required"` or `"optional"` to request a client certificate from {{kib}}.

    ::::{note}
    These settings cannot be used in conjunction with [`elasticsearch.ssl.keystore.path`](#elasticsearch-ssl-keystore-path).
    ::::


$$$elasticsearch-ssl-certificateAuthorities$$$ `elasticsearch.ssl.certificateAuthorities`
:   Paths to one or more PEM-encoded X.509 certificate authority (CA) certificates, which make up a trusted certificate chain for {{es}}. This chain is used by {{kib}} to establish trust when making outbound SSL/TLS connections to {{es}}.

    In addition to this setting, trusted certificates may be specified via [`elasticsearch.ssl.keystore.path`](#elasticsearch-ssl-keystore-path) and/or [`elasticsearch.ssl.truststore.path`](#elasticsearch-ssl-truststore-path).


`elasticsearch.ssl.keyPassphrase`
:   The password that decrypts the private key that is specified via [`elasticsearch.ssl.key`](#elasticsearch-ssl-cert-key). This value is optional, as the key may not be encrypted.

$$$elasticsearch-ssl-keystore-path$$$ `elasticsearch.ssl.keystore.path`
:   Path to a PKCS#12 keystore that contains an X.509 client certificate and it’s corresponding private key. These are used by {{kib}} to authenticate itself when making outbound SSL/TLS connections to {{es}}. For this setting, you must also set the `xpack.security.http.ssl.client_authentication` setting in {{es}} to `"required"` or `"optional"` to request a client certificate from {{kib}}.

    If the keystore contains any additional certificates, they are used as a trusted certificate chain for {{es}}. This chain is used by {{kib}} to establish trust when making outbound SSL/TLS connections to {{es}}. In addition to this setting, trusted certificates may be specified via [`elasticsearch.ssl.certificateAuthorities`](#elasticsearch-ssl-certificateAuthorities) and/or [`elasticsearch.ssl.truststore.path`](#elasticsearch-ssl-truststore-path).

    ::::{note}
    This setting cannot be used in conjunction with [`elasticsearch.ssl.certificate`](#elasticsearch-ssl-cert-key) or [`elasticsearch.ssl.key`](#elasticsearch-ssl-cert-key).
    ::::

`elasticsearch.ssl.keystore.password`
:   The password that decrypts the keystore specified via [`elasticsearch.ssl.keystore.path`](#elasticsearch-ssl-keystore-path). If the keystore has no password, leave this as blank. If the keystore has an empty password, set this to `""`.

$$$elasticsearch-ssl-truststore-path$$$ `elasticsearch.ssl.truststore.path`
:   Path to a PKCS#12 trust store that contains one or more X.509 certificate authority (CA) certificates, which make up a trusted certificate chain for {{es}}. This chain is used by {{kib}} to establish trust when making outbound SSL/TLS connections to {{es}}.

    In addition to this setting, trusted certificates may be specified via [`elasticsearch.ssl.certificateAuthorities`](#elasticsearch-ssl-certificateAuthorities) and/or [`elasticsearch.ssl.keystore.path`](#elasticsearch-ssl-keystore-path).


`elasticsearch.ssl.truststore.password`
:   The password that decrypts the trust store specified via [`elasticsearch.ssl.truststore.path`](#elasticsearch-ssl-truststore-path). If the trust store has no password, leave this as blank. If the trust store has an empty password, set this to `""`.

$$$elasticsearch-ssl-verificationMode$$$ `elasticsearch.ssl.verificationMode`
:   Controls the verification of the server certificate that {{kib}} receives when making an outbound SSL/TLS connection to {{es}}. Valid values are `"full"`, `"certificate"`, and `"none"`. Using `"full"` performs hostname verification, using `"certificate"` skips hostname verification, and using `"none"` skips verification entirely. **Default: `"full"`**

$$$elasticsearch-user-passwd$$$ `elasticsearch.username` and `elasticsearch.password`
:   If your {{es}} is protected with basic authentication, these settings provide the username and password that the {{kib}} server uses to perform maintenance on the {{kib}} index at startup. {{kib}} users still need to authenticate with {{es}}, which is proxied through the {{kib}} server.

$$$elasticsearch-service-account-token$$$ `elasticsearch.serviceAccountToken`
:   If your {{es}} is protected with basic authentication, this token provides the credentials that the {{kib}} server uses to perform maintenance on the {{kib}} index at startup. This setting is an alternative to `elasticsearch.username` and `elasticsearch.password`.

`execution_context.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Propagate request-specific metadata to Elasticsearch server by way of the `x-opaque-id` header.
    It is available in {{ecloud}} 8.1.0 and later versions.
% TBD: Available only in Elastic Cloud?

$$$logging-root$$$ `logging.root`
:   The `root` logger has is a [dedicated logger](docs-content://deploy-manage/monitor/logging-configuration/kibana-logging.md#dedicated-loggers) and is pre-configured. The `root` logger logs at `info` level by default. If any other logging configuration is specified, `root` *must* also be explicitly configured.

$$$logging-root-appenders$$$ `logging.root.appenders`
:   A list of logging appenders to forward the root level logger instance to.  By default `root` is configured with the `default` appender that logs to stdout with a `pattern` layout. This is the configuration that all custom loggers will use unless they’re re-configured explicitly. You can override the default behavior by configuring a different [appender](docs-content://deploy-manage/monitor/logging-configuration/kibana-logging.md#logging-appenders) to apply to `root`.

$$$logging-root-level$$$ `logging.root.level` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Level at which a log record should be logged. Supported levels are: *all*, *fatal*, *error*, *warn*, *info*, *debug*, *trace*, *off*. Levels are ordered from *all* (highest) to *off* and a log record will be logged it its level is higher than or equal to the level of its logger, otherwise the log record is ignored. Use this value to [change the overall log level](docs-content://deploy-manage/monitor/logging-configuration/kibana-log-settings-examples.md#change-overall-log-level). **Default: `info`**.

    ::::{tip}
    Set to `all` to log all events, including system usage information and all requests. Set to `off` to silence all logs.  You can also use the logging [cli commands](docs-content://deploy-manage/monitor/logging-configuration/kib-advanced-logging.md#logging-cli-migration) to set log level to `verbose` or silence all logs.
    ::::


    The following example shows a valid verbose `logging.root` configuration:

    ```text
    logging:
      appenders:
        console_appender:
          type: console
          layout:
            type: pattern
            highlight: true
      root:
        appenders: [console_appender]
        level: all
    ```


$$$logging-loggers$$$ `logging.loggers[]`
:   Allows you to [customize a specific logger instance](docs-content://deploy-manage/monitor/logging-configuration/kibana-log-settings-examples.md#customize-specific-log-records).

`logging.appenders[]`
:   [Appenders](docs-content://deploy-manage/monitor/logging-configuration/kibana-logging.md#logging-appenders) define how and where log messages are displayed (eg. **stdout** or console) and stored (eg. file on the disk).

`map.includeElasticMapsService` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `false` to disable connections to Elastic Maps Service. When `includeElasticMapsService` is turned off, only tile layer configured by [`map.tilemap.url`](#tilemap-url) is available in [Maps](docs-content://explore-analyze/visualize/maps.md). **Default: `true`**

`map.emsUrl`
:   Specifies the URL of a self hosted [{{hosted-ems}}](docs-content://explore-analyze/visualize/maps/maps-connect-to-ems.md#elastic-maps-server)

$$$tilemap-settings$$$ `map.tilemap.options.attribution` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The map attribution string. Provide attributions in markdown and use `\|` to delimit attributions, for example: `"[attribution 1](https://www.attribution1)\|[attribution 2](https://www.attribution2)"`. **Default: `"© [Elastic Maps Service](https://www.elastic.co/elastic-maps-service)"`**

$$$tilemap-max-zoom$$$ `map.tilemap.options.maxZoom` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The maximum zoom level. **Default: `10`**

$$$tilemap-min-zoom$$$ `map.tilemap.options.minZoom` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The minimum zoom level. **Default: `1`**

$$$tilemap-subdomains$$$ `map.tilemap.options.subdomains` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   An array of subdomains used by the tile service. Specify the position of the subdomain the URL with the token `{{s}}`.

$$$tilemap-url$$$ `map.tilemap.url` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The URL to the service that {{kib}} uses as the default basemap in [maps](docs-content://explore-analyze/visualize/maps.md) and [vega maps](docs-content://explore-analyze/visualize/custom-visualizations-with-vega.md#vega-with-a-map). By default, {{kib}} sets a basemap from the [Elastic Maps Service](docs-content://explore-analyze/visualize/maps/maps-connect-to-ems.md), but users can point to their own Tile Map Service. For example: `"https://tiles.elastic.co/v2/default/{{z}}/{x}/{{y}}.png?elastic_tile_service_tos=agree&my_app_name=kibana"`

`migrations.batchSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Defines the number of documents migrated at a time. The higher the value, the faster the Saved Objects migration process performs at the cost of higher memory consumption. If upgrade migrations results in {{kib}} crashing with an out of memory exception or fails due to an Elasticsearch `circuit_breaking_exception`, use a smaller `batchSize` value to reduce the memory pressure. **Default: `1000`**

`migrations.discardUnknownObjects` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Discard saved objects with unknown types during a migration. Must be set to the target version, for example: `8.4.0`. Default: undefined.
    It is available in {{ecloud}} 8.4.0 and later versions.
% TBD: Supported only in Elastic Cloud?

`migrations.discardCorruptObjects` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Discard corrupt saved objects, as well as those that cause transform errors during a migration. Must be set to the target version, for example: `8.4.0`. Default: undefined.
    It is available in {{ecloud}} 8.4.0 and later versions.
% TBD: Supported only in Elastic Cloud?

`migrations.maxBatchSizeBytes`
:   Defines the maximum payload size for indexing batches of upgraded saved objects to avoid migrations failing due to a 413 Request Entity Too Large response from Elasticsearch. This value should be lower than or equal to your Elasticsearch cluster’s `http.max_content_length` configuration option. **Default: `100mb`**

`migrations.retryAttempts`
:   The number of times migrations retry temporary failures, such as a network timeout, 503 status code, or `snapshot_in_progress_exception`. When upgrade migrations frequently fail after exhausting all retry attempts with a message such as `Unable to complete the [...] step after 15 attempts, terminating.`, increase the setting value. **Default: `15`**

`migrations.useCumulativeLogger` {applies_to}`stack: ga 9.2`
:   Skip logging migration progress unless there are any errors. Set to `false` when troubleshooting migration issues and not automatically shown. **Default: `true`**

`newsfeed.enabled`
:   Controls whether to enable the newsfeed system for the {{kib}} UI notification center. Set to `false` to disable the newsfeed system. **Default: `true`**

`node.roles`
:   Indicates which roles to configure the {{kib}} process with, which will effectively run {{kib}} in different modes. Valid options are `background_tasks` and `ui`, or `*` to select all roles. **Default: `*`**. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

`notifications.connectors.default.email`
:   Choose the default email connector for user notifications. As of `8.6.0`, {{kib}} is shipping with a new notification mechanism that will send email notifications for various user actions, e.g. assigning a *Case* to a user. To enable notifications, an email connector must be [preconfigured](/reference/connectors-kibana/pre-configured-connectors.md) in the system via `kibana.yml`, and the notifications plugin must be configured to point to the ID of that connector.

`ops.interval`
:   Set the interval in milliseconds to sample system and process performance metrics. The minimum value is 100. **Default: `5000`**

$$$ops-cGroupOverrides-cpuPath$$$ `ops.cGroupOverrides.cpuPath`
:   Override for cgroup cpu path when mounted in a manner that is inconsistent with `/proc/self/cgroup`.

$$$ops-cGroupOverrides-cpuAcctPath$$$ `ops.cGroupOverrides.cpuAcctPath`
:   Override for cgroup cpuacct path when mounted in a manner that is inconsistent with `/proc/self/cgroup`.

$$$path-data$$$ `path.data`
:   The path where {{kib}} stores persistent data not saved in {{es}}. **Default: `data`**

`permissionsPolicy.report_to:`
:   Add sources for the [Permissions Policy `report-to` directive](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy).


`pid.file`
:   Specifies the path where {{kib}} creates the process ID file.

$$$savedObjects-maxImportExportSize$$$ `savedObjects.maxImportExportSize`
:   The maximum count of saved objects that can be imported or exported. This setting exists to prevent the {{kib}} server from running out of memory when handling large numbers of saved objects. It is recommended to only raise this setting if you are confident your server can hold this many objects in memory. **Default: `10000`**

$$$savedObjects-maxImportPayloadBytes$$$ `savedObjects.maxImportPayloadBytes`
:   The maximum byte size of a saved objects import that the {{kib}} server will accept. This setting exists to prevent the {{kib}} server from running out of memory when handling a large import payload. Note that this setting overrides the more general [`server.maxPayload`](#server-maxPayload) for saved object imports only. **Default: `26214400`**

$$$server-basePath$$$ `server.basePath`
:   Enables you to specify a path to mount {{kib}} at if you are running behind a proxy. Use the [`server.rewriteBasePath`](#server-rewriteBasePath) setting to tell {{kib}} if it should remove the basePath from requests it receives, and to prevent a deprecation warning at startup. This setting cannot end in a slash (`/`).

$$$server-publicBaseUrl$$$ `server.publicBaseUrl`
:   The publicly available URL that end-users access Kibana at. Must include the protocol, hostname, port (if different than the defaults for `http` and `https`, 80 and 443 respectively), and the [`server.basePath`](#server-basePath) (when that setting is configured explicitly). This setting cannot end in a slash (`/`).

$$$server-compression$$$ `server.compression.enabled`
:   Set to `false` to disable HTTP compression for all responses. **Default: `true`**

`server.cors.enabled`
:   Set to `true` to allow cross-origin API calls. **Default:** `false`. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

`server.cors.allowCredentials`
:   Set to `true` to allow browser code to access response body whenever request performed with user credentials. **Default:** `false`. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

`server.cors.allowOrigin` {applies_to}`stack: preview`
:   List of origins permitted to access resources. You must specify explicit hostnames and not use `server.cors.allowOrigin: ["*"]` when `server.cors.allowCredentials: true`. **Default:** ["*"]

`server.compression.referrerWhitelist`
:   Specifies an array of trusted hostnames, such as the {{kib}} host, or a reverse proxy sitting in front of it. This determines whether HTTP compression may be used for responses, based on the request `Referer` header. This setting may not be used when [`server.compression.enabled`](#server-compression) is set to `false`. **Default: `none`**

`server.compression.brotli.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `true` to enable brotli (br) compression format.

    :::{note}
    Browsers not supporting brotli compression will fallback to using gzip instead. This setting may not be used when [`server.compression.enabled`](#server-compression) is set to `false`. **Default: `false`**
    :::

    :::{note}
    It is available in {{ecloud}} 8.6.0 and later versions.
    :::

$$$server-securityResponseHeaders-strictTransportSecurity$$$ `server.securityResponseHeaders.strictTransportSecurity` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Strict-Transport-Security`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are any text value or `null`. To disable, set to `null`. **Default:** `null`

$$$server-securityResponseHeaders-xContentTypeOptions$$$ `server.securityResponseHeaders.xContentTypeOptions` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`X-Content-Type-Options`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are `nosniff` or `null`. To disable, set to `null`. **Default:** `"nosniff"`

$$$server-securityResponseHeaders-referrerPolicy$$$ `server.securityResponseHeaders.referrerPolicy` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Referrer-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are `no-referrer`, `no-referrer-when-downgrade`, `origin`, `origin-when-cross-origin`, `same-origin`, `strict-origin`, `strict-origin-when-cross-origin`, `unsafe-url`, or `null`. To disable, set to `null`. **Default:** `"strict-origin-when-cross-origin"`

$$$server-securityResponseHeaders-permissionsPolicy$$$ `server.securityResponseHeaders.permissionsPolicy` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Permissions-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are any text value or `null`. Refer to the [`Permissions-Policy` documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) for defined directives, values, and text format. To disable, set to `null`. **Default:** `camera=(), display-capture=(), fullscreen=(self), geolocation=(), microphone=(), web-share=()`. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

$$$server-securityResponseHeaders-permissionsPolicyReportOnly$$$ `server.securityResponseHeaders.permissionsPolicyReportOnly` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Permissions-Policy-Report-Only`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are any text value or `null`. Refer to the [`Permissions-Policy` documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy) for defined directives, values, and text format. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

$$$server-securityResponseHeaders-disableEmbedding$$$`server.securityResponseHeaders.disableEmbedding` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Content-Security-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) and [`X-Frame-Options`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options) headers are configured to disable embedding {{kib}} in other webpages using iframes. When set to `true`, secure headers are used to disable embedding, which adds the `frame-ancestors: 'self'` directive to the `Content-Security-Policy` response header and adds the `X-Frame-Options: SAMEORIGIN` response header. **Default:** `false`

$$$server-securityResponseHeaders-crossOriginOpenerPolicy$$$ `server.securityResponseHeaders.crossOriginOpenerPolicy` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Controls whether the [`Cross-Origin-Opener-Policy`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cross-Origin-Opener-Policy) header is used in all responses to the client from the {{kib}} server, and specifies what value is used. Allowed values are `unsafe-none`, `same-origin-allow-popups`, `same-origin`, or `null`. To disable, set to `null`. **Default:** `"same-origin"`
    It is available in {{ecloud}} 8.7.0 and later versions.

`server.customResponseHeaders` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Header names and values to send on all responses to the client from the {{kib}} server. **Default: `{}`**

$$$server-shutdownTimeout$$$ `server.shutdownTimeout`
:   Sets the grace period for {{kib}} to attempt to resolve any ongoing HTTP requests after receiving a `SIGTERM`/`SIGINT` signal, and before shutting down. Any new HTTP requests received during this period are rejected, because the incoming socket is closed without further processing. **Default: `30s`**

$$$server-host$$$ `server.host`
:   This setting specifies the host of the back end server. To allow remote users to connect, set the value to the IP address or DNS name of the {{kib}} server. Use `0.0.0.0` to make Kibana listen on all IPs (public and private). **Default: `"localhost"`**

`server.keepaliveTimeout`
:   The number of milliseconds to wait for additional data before restarting the [`server.socketTimeout`](#server-socketTimeout) counter. **Default: `"120000"`**

$$$server-maxPayload$$$ `server.maxPayload` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   The maximum payload size in bytes for incoming server requests. **Default: `1048576`**

`server.name`
:   A human-readable display name that identifies this {{kib}} instance. **Default: `"your-hostname"`**

$$$server-port$$$ `server.port`
:   {{kib}} is served by a back end server. This setting specifies the port to use. **Default: `5601`**

$$$server-protocol$$$ `server.protocol`
:   The HTTP protocol to use, either `http1` or `http2`. Set to `http1` to opt out of `HTTP/2` support when TLS is enabled. Use of `http1` may impact browser loading performance especially for dashboards with many panels. **Default**: `http2` if TLS is enabled, otherwise `http1`. This functionality is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.

    ::::{note}
    By default, enabling `http2` requires a valid `h2c` configuration, meaning that TLS must be enabled via [`server.ssl.enabled`](#server-ssl-enabled) and [`server.ssl.supportedProtocols`](#server-ssl-supportedProtocols), if specified, must contain at least `TLSv1.2` or `TLSv1.3`. Strict validation of the `h2c` setup can be disabled by adding `server.http2.allowUnsecure: true` to the configuration.
    ::::


$$$server-rate-limiter-enabled$$$ `server.rateLimiter.enabled`
:   Enables rate-limiting of requests to the {{kib}} server based on Node.js' Event Loop Utilization. If the average event loop utilization for the specified term exceeds the configured threshold, the server will respond with a `429 Too Many Requests` status code.

    This functionality should be used carefully as it may impact the server’s availability. The configuration options vary per environment, so it is recommended to enable this option in a testing environment first, adjust the rate-limiter configuration, and then roll it out to production.

    **Default: `false`**


`server.rateLimiter.elu`
:   The Event Loop Utilization (ELU) threshold for rate-limiting requests to the {{kib}} server. The ELU is a value between 0 and 1, representing the average event loop utilization over the specified term. If the average ELU exceeds this threshold, the server will respond with a `429 Too Many Requests` status code.

    In a multi-instance environment with autoscaling, this value is usually between 0.6 and 0.8 to give the autoscaler enough time to react. This value can be higher in a single-instance environment but should not exceed 1.0. In general, the lower the value, the more aggressive the rate limiting. And the highest possible option should be used to prevent the {{kib}} server from being terminated.


`server.rateLimiter.term`
:   This value is one of `short`, `medium`, or `long`, representing the term over which the average event loop utilization is calculated. It uses exponential moving averages (EMA) to smooth out the utilization values. Each term corresponds to `15s`, `30s`, and `60s`, respectively.

    The term value also changes the way the rate limiter sees the trend in the load:

    * `short`: `elu.short > server.rateLimiter.term`;
    * `medium`: `elu.short > server.rateLimiter.elu AND elu.medium > server.rateLimiter.elu`;
    * `long`: `elu.short > server.rateLimiter.elu AND elu.medium > server.rateLimiter.elu AND elu.long > server.rateLimiter.elu`.

    This behavior prevents requests from being throttled if the load starts decreasing. In general, the shorter the term, the more aggressive the rate limiting. In the multi-instance environment, the `medium` term makes the most sense as it gives the {{kib}} server enough time to spin up a new instance and prevents the existing instances from being terminated.


$$$server-requestId-allowFromAnyIp$$$ `server.requestId.allowFromAnyIp`
:   Sets whether or not the `X-Opaque-Id` header should be trusted from any IP address for identifying requests in logs and forwarded to Elasticsearch.

`server.requestId.ipAllowlist`
:   A list of IPv4 and IPv6 address which the `X-Opaque-Id` header should be trusted from. Normally this would be set to the IP addresses of the load balancers or reverse-proxy that end users use to access Kibana. If any are set, [`server.requestId.allowFromAnyIp`](#server-requestId-allowFromAnyIp) must also be set to `false.`

$$$server-rewriteBasePath$$$ `server.rewriteBasePath`
:   Specifies whether {{kib}} should rewrite requests that are prefixed with [`server.basePath`](#server-basePath) or require that they are rewritten by your reverse proxy. **Default: `false`**

$$$server-socketTimeout$$$ `server.socketTimeout`
:   The number of milliseconds to wait before closing an inactive socket. **Default: `"120000"`**

$$$server-payloadTimeout$$$ `server.payloadTimeout`
:   Sets the maximum time allowed for the client to transmit the request payload (body) before giving up and responding with a Request Timeout (408) error response. **Default: `"20000"`**

$$$server-ssl-cert-key$$$ `server.ssl.certificate` and `server.ssl.key`
:   Paths to a PEM-encoded X.509 server certificate and its corresponding private key. These are used by {{kib}} to establish trust when receiving inbound SSL/TLS connections from users.

    ::::{note}
    These settings cannot be used in conjunction with [`server.ssl.keystore.path`](#server-ssl-keystore-path).
    ::::


$$$server-ssl-certificateAuthorities$$$ `server.ssl.certificateAuthorities`
:   Paths to one or more PEM-encoded X.509 certificate authority (CA) certificates which make up a trusted certificate chain for {{kib}}. This chain is used by {{kib}} to establish trust when receiving inbound SSL/TLS connections from end users. If PKI authentication is enabled, this chain is also used by {{kib}} to verify client certificates from end users.

    In addition to this setting, trusted certificates may be specified via [`server.ssl.keystore.path`](#server-ssl-keystore-path) and/or [`server.ssl.truststore.path`](#server-ssl-truststore-path).


$$$server-ssl-cipherSuites$$$ `server.ssl.cipherSuites`
:   Details on the format, and the valid options, are available via the [OpenSSL cipher list format documentation](https://www.openssl.org/docs/man1.1.1/man1/ciphers.md#CIPHER-LIST-FORMAT). **Default: `TLS_AES_256_GCM_SHA384 TLS_CHACHA20_POLY1305_SHA256 TLS_AES_128_GCM_SHA256 ECDHE-RSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-GCM-SHA384, ECDHE-ECDSA-AES256-GCM-SHA384, DHE-RSA-AES128-GCM-SHA256, ECDHE-RSA-AES128-SHA256, DHE-RSA-AES128-SHA256, ECDHE-RSA-AES256-SHA384, DHE-RSA-AES256-SHA384, ECDHE-RSA-AES256-SHA256, DHE-RSA-AES256-SHA256, HIGH,!aNULL, !eNULL, !EXPORT, !DES, !RC4, !MD5, !PSK, !SRP, !CAMELLIA`**.

`server.ssl.clientAuthentication`
:   Controls the behavior in {{kib}} for requesting a certificate from client connections. Valid values are `"required"`, `"optional"`, and `"none"`. Using `"required"` will refuse to establish the connection unless a client presents a certificate, using `"optional"` will allow a client to present a certificate if it has one, and using `"none"` will prevent a client from presenting a certificate. **Default: `"none"`**

$$$server-ssl-enabled$$$ `server.ssl.enabled`
:   | Enables SSL/TLS for inbound connections to {{kib}}. When set to `true`, a certificate and its corresponding private key must be provided. These can be specified via [`server.ssl.keystore.path`](#server-ssl-keystore-path) or the combination of [`server.ssl.certificate`](#server-ssl-cert-key) and [`server.ssl.key`](#server-ssl-cert-key). **Default: `false`**

`server.ssl.keyPassphrase`
:   The password that decrypts the private key that is specified via [`server.ssl.key`](#server-ssl-cert-key). This value is optional, as the key may not be encrypted.

$$$server-ssl-keystore-path$$$ `server.ssl.keystore.path`
:   Path to a PKCS#12 keystore that contains an X.509 server certificate and its corresponding private key. If the keystore contains any additional certificates, those will be used as a trusted certificate chain for {{kib}}. All of these are used by {{kib}} to establish trust when receiving inbound SSL/TLS connections from end users. The certificate chain is also used by {{kib}} to verify client certificates from end users when PKI authentication is enabled.

    In addition to this setting, trusted certificates may be specified via [`server.ssl.certificateAuthorities`](#server-ssl-certificateAuthorities) and/or [`server.ssl.truststore.path`](#server-ssl-truststore-path).

    ::::{note}
    This setting cannot be used in conjunction with [`server.ssl.certificate`](#server-ssl-cert-key) or [`server.ssl.key`](#server-ssl-cert-key)
    ::::


`server.ssl.keystore.password`
:   The password that will be used to decrypt the keystore specified via [`server.ssl.keystore.path`](#server-ssl-keystore-path). If the keystore has no password, leave this unset. If the keystore has an empty password, set this to `""`.

$$$server-ssl-truststore-path$$$ `server.ssl.truststore.path`
:   Path to a PKCS#12 trust store that contains one or more X.509 certificate authority (CA) certificates which make up a trusted certificate chain for {{kib}}. This chain is used by {{kib}} to establish trust when receiving inbound SSL/TLS connections from end users. If PKI authentication is enabled, this chain is also used by {{kib}} to verify client certificates from end users.

    In addition to this setting, trusted certificates may be specified via [`server.ssl.certificateAuthorities`](#server-ssl-certificateAuthorities) and/or [`server.ssl.keystore.path`](#server-ssl-keystore-path).


`server.ssl.truststore.password`
:   The password that will be used to decrypt the trust store specified via [`server.ssl.truststore.path`](#server-ssl-truststore-path). If the trust store has no password, leave this unset. If the trust store has an empty password, set this to `""`.

`server.ssl.redirectHttpFromPort`
:   {{kib}} binds to this port and redirects all http requests to https over the port configured as [`server.port`](#server-port).

$$$server-ssl-supportedProtocols$$$ `server.ssl.supportedProtocols`
:   An array of supported protocols with versions. Valid protocols: `TLSv1`, `TLSv1.1`, `TLSv1.2`, `TLSv1.3`. **Default: TLSv1.2, TLSv1.3** Enabling `TLSv1.1` would require both setting the `--tls-min-1.1` option in the `node.options` configuration and adding `TLSv1.1` to `server.ssl.supportedProtocols`. `HTTP/2` requires the use of minimum `TLSv1.2` for secure connections.

$$$server-uuid$$$ `server.uuid`
:   The unique identifier for this {{kib}} instance. It must be a valid UUIDv4. It gets automatically generated on the first startup if not specified and persisted in the `data` path.

$$$settings-xsrf-allowlist$$$ `server.xsrf.allowlist` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   It is not recommended to disable protections for arbitrary API endpoints. Instead, supply the `kbn-xsrf` header. The [`server.xsrf.allowlist`](#settings-xsrf-allowlist) setting requires the following format:

    ```text
    *Default: [ ]* An array of API endpoints which should be exempt from Cross-Site Request Forgery ("XSRF") protections.
    ```
    It is available in {{ecloud}} 8.0.0 and later versions.


$$$settings-xsrf-disableProtection$$$ `server.xsrf.disableProtection`
:   Setting this to `true` will completely disable Cross-site request forgery protection in Kibana. This is not recommended. **Default: `false`**

`status.allowAnonymous`
:   If authentication is enabled, setting this to `true` enables unauthenticated users to access the {{kib}} server status API and status page. **Default: `false`**

$$$telemetry-allowChangingOptInStatus$$$ `telemetry.allowChangingOptInStatus`
:   When `false`, users cannot change the opt-in status through [Advanced Settings](/reference/advanced-settings.md), and {{kib}} only looks at the value of [`telemetry.optIn`](#settings-telemetry-optIn) to determine whether to send telemetry data or not. **Default: `true`**.

$$$settings-telemetry-optIn$$$ `telemetry.optIn`
:   Set to `false` to stop sending any telemetry data to Elastic. Reporting your cluster statistics helps us improve your user experience. When `false`, the telemetry data is never sent to Elastic.<br>

    This setting can be changed at any time in [Advanced Settings](/reference/advanced-settings.md). To prevent users from changing it, set [`telemetry.allowChangingOptInStatus`](#telemetry-allowChangingOptInStatus) to `false`. **Default: `true`**

`unifiedSearch.autocomplete.valueSuggestions.timeout` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Time in milliseconds to wait for autocomplete suggestions from {{es}}. This value must be a whole number greater than zero. **Default: `"1000"`**

`unifiedSearch.autocomplete.valueSuggestions.terminateAfter` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Maximum number of documents loaded by each shard to generate autocomplete suggestions. This value must be a whole number greater than zero. **Default: `"100000"`**

    ::::{note}
    To reload the logging settings, send a SIGHUP signal to {{kib}}. For more logging configuration options, see the [Configure Logging in {{kib}}](docs-content://deploy-manage/monitor/logging-configuration/kibana-logging.md) guide.
    ::::

`uiSettings.globalOverrides.hideAnnouncements` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.4`
:   Set to `true` to stop showing messages and tours that highlight new features. **Default: `false`**

`uiSettings.globalOverrides.hideFeedback` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.4`
:   Set to `true` to stop showing elements requesting user feedback. **Default: `false`**

`vis_type_table.legacyVisEnabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Starting from version 7.11, a new datatable visualization is used. Set to `true` to enable the legacy version. In version 8.0 and later, the old implementation is removed and this setting is no longer supported.

`vis_type_vega.enable` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   For 7.7 version and later, set to `false` to disable Vega vizualizations. **Default: `true`**

`vega.enableExternalUrls` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `true` to allow Vega vizualizations to use data from sources other than the linked Elasticsearch cluster. In version 8.0 and later, the `vega.enableExternalUrls` is not supported. Use `vis_type_vega.enableExternalUrls` instead.

`vis_type_vega.enableExternalUrls` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set this value to true to allow Vega to use any URL to access external data sources and images. When false, Vega can only get data from {{es}}. **Default: `false`**

`xpack.ccr.ui.enabled`
:   Set this value to false to disable the Cross-Cluster Replication UI. **Default: `true`**

$$$settings-explore-data-in-context$$$ `xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled`
:   Enables the **Explore underlying data** option that allows you to open **Discover** from a dashboard panel and view the panel data. **Default: `false`**

    When you create visualizations using the **Lens** drag-and-drop editor, you can use the toolbar to open and explore your data in **Discover**. For more information, check out [Explore the data in Discover](docs-content://explore-analyze/visualize/lens.md#explore-lens-data-in-discover).

$$$settings-explore-data-in-chart$$$ `xpack.discoverEnhanced.actions.exploreDataInChart.enabled`
:   Enables you to view the underlying documents in a data series from a dashboard panel. **Default: `false`**

`xpack.ilm.ui.enabled`
:   Set this value to false to disable the Index Lifecycle Policies UI. **Default: `true`**

`xpack.index_management.ui.enabled`
:   Set this value to false to disable the Index Management UI. **Default: `true`**

`xpack.license_management.ui.enabled`
:   Set this value to false to disable the License Management UI. **Default: `true`**

`xpack.remote_clusters.ui.enabled`
:   Set this value to false to disable the Remote Clusters UI. **Default: `true`**

`xpack.rollup.ui.enabled`
:   Set this value to false to disable the Rollup Jobs UI. **Default: true**

    ::::{admonition} Deprecated in 8.11.0.
    :class: warning
    Rollups are deprecated and will be removed in a future version. Use [downsampling](docs-content://manage-data/data-store/data-streams/downsampling-time-series-data-stream.md) instead.
    ::::

`xpack.securitySolution.maxUploadResponseActionFileBytes` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Allow to configure the max file upload size for use with the Upload File Repsonse action available with the Defend Integration.  To learn more, check [Endpoint Response actions](docs-content://solutions/security/endpoint-response-actions.md).
    It is available in {{ecloud}} 8.9.0 and later versions.

`xpack.securitySolution.disableEndpointRuleAutoInstall` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.2.4+`
:   Set to `true` to disable the automatic installation of Elastic Defend SIEM rules when a new Endpoint integration policy is created. Introduced with v9.2.4. Default is `false`.


`xpack.snapshot_restore.ui.enabled`
:   Set this value to false to disable the Snapshot and Restore UI. **Default: true**

`xpack.upgrade_assistant.ui.enabled`
:   Set this value to false to disable the Upgrade Assistant UI. **Default: true**
