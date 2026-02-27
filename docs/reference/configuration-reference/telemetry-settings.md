---
navigation_title: "Telemetry settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/telemetry-settings-kbn.html
applies_to:
  deployment:
    self: all
---

# Telemetry settings in {{kib}} [telemetry-settings-kbn]


Usage Collection (also known as Telemetry) is enabled by default. This allows us to learn what our users are most interested in, so we can improve our products and services.

Refer to our [Privacy Statement](https://www.elastic.co/legal/product-privacy-statement) to learn more.

You can control whether this data is sent from the {{kib}} servers, or if it should be sent from the user’s browser, in case a firewall is blocking the connections from the server. Additionally, you can disable this feature either in **Stack Management > {{kib}} > Advanced Settings > Global Settings > Usage collection** or the config file with the following settings.


## General telemetry settings [telemetry-general-settings]

$$$telemetry-optIn$$$ `telemetry.optIn`
:   Set to `false` to stop sending any telemetry data to Elastic. Reporting your cluster statistics helps us improve your user experience. **Default: `true`.**<br>

    This setting can be changed at any time in [Advanced Settings](/reference/advanced-settings.md). To prevent users from changing it, set [`telemetry.allowChangingOptInStatus`](/reference/configuration-reference/general-settings.md#telemetry-allowChangingOptInStatus) to `false`.


`telemetry.allowChangingOptInStatus`
:   Set to `false` to disallow overwriting the [`telemetry.optIn`](#telemetry-optIn) setting via the [Advanced Settings](/reference/advanced-settings.md) in {{kib}}. **Default: `true`.**

`telemetry.sendUsageFrom`
:   Set to `'server'` to report the cluster statistics from the {{kib}} server. If the server fails to connect to our endpoint at [https://telemetry.elastic.co/](https://telemetry.elastic.co/), it assumes it is behind a firewall and falls back to `'browser'` to send it from users' browsers when they are navigating through {{kib}}. **Default: `'server'`.**

`xpack.apm.telemetryCollectionEnabled`
:   Collects information about APM data and API performance. Set this to `false` to specifically disable APM’s collector. **Default: `'true'`.**

