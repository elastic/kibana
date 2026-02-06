---
navigation_title: "{{fleet}} settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/fleet-settings-kb.html
applies_to:
  deployment:
    ess: all
    self: all
---

# {{fleet}} settings in {{kib}} [fleet-settings-kb]


::::{note}
In {{ecloud}}, {{fleet}} flags are already configured.
If a setting is applicable to {{ech}} environments, its name is followed by this icon: ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on Elastic Cloud Hosted")
::::

By default, {{fleet}} is enabled. To use {{fleet}}, you also need to configure {{kib}} and {{es}} hosts.

Many {{fleet}} settings can also be configured directly through the {{fleet}} UI. See [Fleet UI settings](docs-content://reference/fleet/fleet-settings.md) for details.

Go to the [{{fleet}}](docs-content://reference/fleet/index.md) docs for more information about {{fleet}}.

## General {{fleet}} settings [general-fleet-settings-kb]

`xpack.fleet.agents.enabled` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `true` (default) to enable {{fleet}}.

`xpack.fleet.isAirGapped`
:   Set to `true` to indicate {{fleet}} is running in an air-gapped environment. Refer to [Air-gapped environments](docs-content://reference/fleet/air-gapped.md) for details. Enabling this flag helps Fleet skip needless requests and improve the user experience for air-gapped environments.

`xpack.fleet.createArtifactsBulkBatchSize` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Allow to configure batch size for creating and updating Fleet user artifacts.  Examples include creation of Trusted Applications and Endpoint Exceptions in Security. It is available in {{ecloud}} 8.9.0 and later versions.
% TBD: Supported only in Elastic Cloud?

## {{package-manager}} settings [fleet-data-visualizer-settings]

`xpack.fleet.registryUrl`
:   The address to use to reach the {{package-manager}} registry.

`xpack.fleet.registryProxyUrl`
:   The proxy address to use to reach the {{package-manager}} registry if an internet connection is not directly available. Refer to [Air-gapped environments](docs-content://reference/fleet/air-gapped.md) for details.

`xpack.fleet.packageVerification.gpgKeyPath`
:   The path on disk to the GPG key used to verify {{package-manager}} packages. If the Elastic public key is ever reissued as a security precaution, you can use this setting to specify the new key.


## {{fleet}} settings [_fleet_settings]

`xpack.fleet.agents.fleet_server.hosts`
:   Hostnames used by {{agent}} for accessing {{fleet-server}}.

    If configured in your `kibana.yml`, this setting is grayed out and unavailable in the {{fleet}} UI. To make this setting editable in the UI, do not configure it in the configuration file.


`xpack.fleet.agents.elasticsearch.hosts`
:   Hostnames used by {{agent}} for accessing {{es}}.

`xpack.fleet.agents.elasticsearch.ca_sha256`
:   Hash pin used for certificate verification. The pin is a base64-encoded string of the SHA-256 fingerprint.


## Preconfiguration settings (for advanced use cases) [_preconfiguration_settings_for_advanced_use_cases]

Use these settings to pre-define integrations, agent policies, and {{fleet-server}} hosts or proxies that you want {{fleet}} to load up by default.

::::{note}
These settings are not supported to pre-configure the Endpoint and Cloud Security integration.
::::


`xpack.fleet.packages`
:   List of integrations that are installed when the {{fleet}} app starts up for the first time.

    **Required properties of `xpack.fleet.packages`**:

    `name`
    :   Name of the integration from the package registry.

    `version`
    :   Either an exact semantic version, or the keyword `latest` to fetch the latest integration version.


`xpack.fleet.agentPolicies`
:   List of agent policies that are configured when the {{fleet}} app starts.

    **Required properties of `xpack.fleet.agentPolicies`**:

    `id`
    :   Unique ID for this policy. The ID may be a number or string.

    `name`
    :   Policy name.


    **Optional properties of `xpack.fleet.agentPolicies`**:

    `description`
    :   Text description of this policy.

    `namespace`
    :   String identifying this policy’s namespace.

    `monitoring_enabled`
    :   List of keywords that specify the monitoring data to collect. Valid values include `['logs']`, `['metrics']`, and `['logs', 'metrics']`.

    `keep_monitoring_alive`
    :   If `true`, monitoring will be enabled, but logs/metrics collection will be disabled. Use this if you want to keep agent’s monitoring server alive even when logs/metrics aren’t being collected.

    `is_managed`
    :   If `true`, this policy is not editable by the user and can only be changed by updating the {{kib}} config.

    `is_default` {applies_to}`stack: deprecated 8.1.0`
    :   If `true`, this policy is the default agent policy.

    `is_default_fleet_server` {applies_to}`stack: deprecated 8.1.0`
    :   If `true`, this policy is the default {{fleet-server}} agent policy.

    `data_output_id`
    :   ID of the output to send data. (Need to be identical to `monitoring_output_id`)

    `monitoring_output_id`
    :   ID of the output to send monitoring data. (Need to be identical to `data_output_id`)

    `fleet_server_host_id`
    :   ID of the fleet server.

    `package_policies`
    :   List of integration policies to add to this policy.

        **Properties of `package_policies`**:

        `id`
        :   Unique ID of the integration policy. The ID may be a number or string.

        `name`
        :   (required) Name of the integration policy.

        `package`
        :   (required) Integration that this policy configures.

            **Properties of `package`**:

            `name`
            :   Name of the integration associated with this policy.

        `description`
        :   Text string describing this integration policy.

        `namespace`
        :   String identifying this policy’s namespace.

        `inputs`
        :   Map of input for the integration. Follows the same schema as the package policy API inputs, with the exception that any object in `vars` can be passed `frozen: true` in order to prevent that specific `var` from being edited by the user.

    Example configuration:

    ```yaml
    xpack.fleet.packages:
      - name: apache
        version: 0.5.0

    xpack.fleet.agentPolicies:
      - name: Preconfigured Policy
        id: preconfigured-policy
        namespace: test
        package_policies:
          - package:
              name: system
            name: System Integration
            namespace: test
            id: preconfigured-system
            inputs:
              system-system/metrics:
                enabled: true
                vars:
                  '[system.hostfs]': home/test
                streams:
                  '[system.core]':
                    enabled: true
                    vars:
                      period: 20s
              system-winlog:
                enabled: false
    ```


`xpack.fleet.outputs`
:   List of outputs that are configured when the {{fleet}} app starts.

    Certain types of outputs have additional required and optional settings. Refer to [Output settings](docs-content://reference/fleet/fleet-settings.md#output-settings) in the {{fleet}} and {{agent}} Guide for the full list of settings for each output type.

    If configured in your `kibana.yml`, output settings are grayed out and unavailable in the {{fleet}} UI. To make these settings editable in the UI, do not configure them in the configuration file.

    ::::{note}
    The `xpack.fleet.outputs` settings are intended for advanced configurations such as having multiple outputs. We recommend not enabling the `xpack.fleet.agents.elasticsearch.host` settings when using `xpack.fleet.outputs`.
    ::::


    **Required properties of `xpack.fleet.outputs`**:

    `id`
    :   Unique ID for this output. The ID should be a string.

    `name`
    :   Output name.

    `type`
    :   Type of Output. Currently we support "elasticsearch", "logstash", "kafka", and "remote_elasticsearch".

    `hosts`
    :   Array that contains the list of host for that output.


    **Optional properties of `xpack.fleet.outputs`**:

    `is_default`
    :   If `true`, the output specified in `xpack.fleet.outputs` will be the one used to send agent data unless there is another one configured specifically for the agent policy.

    `is_default_monitoring`
    :   If `true`, the output specified in `xpack.fleet.outputs` will be the one used to send agent monitoring data unless there is another one configured specifically for the agent policy.

    `is_internal`
    :   If `true`, the output specified in `xpack.fleet.outputs` will not appear in the UI, and can only be managed via `kibana.yml` or the Fleet API.

    `config`
    :   Extra config for that output.

    `proxy_id`
    :   Unique ID of a proxy to access the output.

    `ssl`
    :   Set to enable authentication using the Secure Sockets Layer (SSL) protocol.

        **Properties of `ssl`**:

        `certificate`
        :   The SSL certificate that {{agents}} use to authenticate with the output. Include the full contents of the certificate here.

    `secrets`
    :   Include here any values for preconfigured outputs that should be stored as secrets. A secret value is replaced in the `kibana.yml` settings file with a reference, with the original value stored externally as a secure hash. Note that this type of secret storage requires all configured {{fleet-server}}s to be on version 8.12.0 or later.

        **Properties of `secrets`**

        `key`:
        :   The private certificate key that {{agents}} use to authenticate with the output.

    Example `xpack.fleet.outputs` configuration:

    ```yaml
    xpack.fleet.outputs:
      - id: my-logstash-output-with-a-secret
        name: preconfigured logstash output with a secret
        type:  logstash
        hosts: ["localhost:9999"]
        ssl:
          certificate: xxxxxxxxxx
        secrets:
          ssl:
            key: securekey
    ```


`xpack.fleet.fleetServerHosts`
:   List of {{fleet-server}} hosts that are configured when the {{fleet}} app starts.

    **Required properties of `xpack.fleet.fleetServerHosts`**

    `id`
    :   Unique ID for the host server.

    `name`
    :   Name of the host server.

    `host_urls`
    :   Array of one or more host URLs that {{agents}} will use to connect to {{fleet-server}}.

    **Optional properties of `xpack.fleet.fleetServerHosts`**:

    `is_default`
    :   Whether or not this host should be the default to use for {{fleet-server}}.

    `is_internal`
    :   If `true` the host will not appear in the UI, and can only be managed through `kibana.yml` or the {{fleet}} API.

    `proxy_id`
    :   Unique ID of the proxy to access the {{fleet-server}} host.

`xpack.fleet.proxy`
:   List of proxies to access {{fleet-server}} that are configured when the {{fleet}} app starts.

    **Required properties of `xpack.fleet.proxy`**:

    `id`
    :   Unique ID of the proxy to access the {{fleet-server}} host.

    `name`
    :   Name of the proxy to access the {{fleet-server}} host.

    `url`
    :   URL that {{agents}} use to connect to the proxy to access {{fleet-server}}.

    **Optional properties of `xpack.fleet.proxy`**:

    `proxy_headers`
    :   Map of headers to use with the proxy. .Properties of `proxy_headers`


        `key`
        :   Key to use for the proxy header.

        `value`
        :   Value to use for the proxy header.


    `certificate_authorities`
    :   Certificate authority (CA) used to issue the certificate.

    `certificate`
    :   The name of the certificate used to authenticate the proxy.

    `certificate_key`
    :   The certificate key used to authenticate the proxy.


`xpack.fleet.enableExperimental` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: deprecated 9.3.0`
:   List of experimental feature flag to enable in Fleet.
    It is available in {{ecloud}} 8.6.0 and later versions.
    From 9.3.0 onwards, use `xpack.fleet.experimentalFeatures` to explicitly enable or disable experimental features.

`xpack.fleet.experimentalFeatures` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.3.0`
:   Set experimental feature flags to `true` or `false` to enable or disable them, respectively.

    Example configuration:

    ```yaml
    xpack.fleet.experimentalFeatures:
      useSpaceAwareness: false
      enableAgentPrivilegeLevelChange: true
    ```

    ::::{note}
    Experimental features should not be enabled in production environments. The features in this section are experimental and may be changed or removed completely in future releases. Elastic will make a best effort to fix any issues, but experimental features are not supported to the same level as generally available (GA) features.
    ::::

`xpack.fleet.enableManagedLogsAndMetricsDataviews` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}")
:   Set to `true` (default), to enable the automatic creation of global `logs-*` and `metrics-*` data views.

`xpack.fleet.autoUpgrades.taskInterval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.1`
:   Configure the interval of the automatic upgrade task for {{fleet}}-managed {{agents}}. Defaults to `30m`.

`xpack.fleet.autoUpgrades.retryDelays` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.1`
:   Configure the retry delays of the automatic upgrade task for {{fleet}}-managed {{agents}}. The array's length indicates the maximum number of retries. Defaults to `['30m', '1h', '2h', '4h', '8h', '16h', '24h']`.

`xpack.fleet.integrationRollbackTTL` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.3`
:   Configure the time-to-live (TTL) for integration rollback availability. This setting controls how long the rollback option remains available after an integration is upgraded. The value must be specified in a duration format (for example, `7d`, `14d`, `168h`, or `1w`). Defaults to `7d` (7 days). For more information, refer to [Roll back an integration](docs-content://reference/fleet/roll-back-integration.md).

`xpack.fleet.fleetPolicyRevisionsCleanup.max_revisions` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.1`
: The maximum number of revisions to maintain for a Fleet agent policy. Defaults to `10`.

`xpack.fleet.fleetPolicyRevisionsCleanup.interval` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.1`
: The time interval for performing cleanups of Fleet agent policy revisions. The value must be specified in a duration format (for example, `30m`, `1h`, `1d`). Defaults to `1h` (1 hour).

`xpack.fleet.fleetPolicyRevisionsCleanup.max_policies_per_run` ![logo cloud](https://doc-icons.s3.us-east-2.amazonaws.com/logo_cloud.svg "Supported on {{ech}}") {applies_to}`stack: ga 9.1`
: The maximum number of Fleet agent policies to clean up revisions from per interval. Defaults to `100`.