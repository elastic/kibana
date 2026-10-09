---
navigation_title: "Telemetry settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/telemetry-settings-kbn.html
applies_to:
  stack: ga
  serverless: ga
---

# Telemetry settings in {{kib}} [telemetry-settings-kbn]

Usage Collection (also known as Telemetry) is enabled by default. This allows us to learn what our users are most interested in, so we can improve our products and services.

Refer to our [Privacy Statement](https://www.elastic.co/legal/product-privacy-statement) to learn more.

## General telemetry settings [telemetry-general-settings]
```{applies_to}
deployment:
  self: ga
  ece: ga
  eck: ga
  ech: unavailable
serverless: unavailable
```

You can control whether this data is sent from the {{kib}} servers, or if it should be sent from the user's browser, in case a firewall is blocking the connections from the server. Additionally, you can disable this feature either in **Stack Management > {{kib}} > Advanced Settings > Global Settings > Usage collection** or the config file with the following settings.

:::{settings} /reference/configuration-reference/telemetry-settings.yml
:::

## Security telemetry [security-telemetry]
```{applies_to}
stack: ga
serverless:
  security: ga
```

{{kib}} transmits certain information about {{elastic-sec}} when users interact with the {{security-app}}, detailed below. {{kib}} redacts or obfuscates personal data such as IP addresses, host names, and usernames before transmitting messages to Elastic. Security-specific telemetry events include:

* **Detection rule security alerts:** Information about Elastic-authored prebuilt detection rules using the detection engine. Examples of alert data include machine learning job influencers, process names, and cloud audit events.
* **{{elastic-endpoint}} Security alerts:** Information about malicious activity detected using {{elastic-endpoint}} detection engines. Examples of alert data include malicious process names, digital signatures, and file names written by the malicious software. Examples of alert metadata include the time of the alert, the {{elastic-endpoint}} version and related detection engine versions.
* **Configuration data for {{elastic-endpoint}}:** Information about the configuration of {{elastic-endpoint}} deployments. Examples of configuration data include the Endpoint versions, operating system versions, and performance counters for Endpoint.
* **Exception list entries for Elastic rules:** Information about exceptions added for Elastic rules. Examples include trusted applications, detection exceptions, and rule exceptions.
* **Security alert activity records:** Information about actions taken on alerts generated in the {{security-app}}, such as acknowledged or closed.

To learn more, refer to our [Privacy Statement](https://www.elastic.co/legal/product-privacy-statement).
