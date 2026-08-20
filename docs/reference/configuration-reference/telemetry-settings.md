---
navigation_title: "Telemetry settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/telemetry-settings-kbn.html
applies_to:
  deployment:
    self: all
---

# Telemetry settings in {{kib}} [telemetry-settings-kbn]

:::{settings} /reference/configuration-reference/telemetry-settings.yml
:::

## Security telemetry [security-telemetry]

{{kib}} transmits certain information about {{elastic-sec}} when users interact with the {{security-app}}, detailed below. {{kib}} redacts or obfuscates personal data such as IP addresses, host names, and usernames before transmitting messages to Elastic. Security-specific telemetry events include:

* **Detection rule security alerts:** Information about Elastic-authored prebuilt detection rules using the detection engine. Examples of alert data include machine learning job influencers, process names, and cloud audit events.
* **{{elastic-endpoint}} Security alerts:** Information about malicious activity detected using {{elastic-endpoint}} detection engines. Examples of alert data include malicious process names, digital signatures, and file names written by the malicious software. Examples of alert metadata include the time of the alert, the {{elastic-endpoint}} version and related detection engine versions.
* **Configuration data for {{elastic-endpoint}}:** Information about the configuration of {{elastic-endpoint}} deployments. Examples of configuration data include the Endpoint versions, operating system versions, and performance counters for Endpoint.
* **Exception list entries for Elastic rules:** Information about exceptions added for Elastic rules. Examples include trusted applications, detection exceptions, and rule exceptions.
* **Security alert activity records:** Information about actions taken on alerts generated in the {{security-app}}, such as acknowledged or closed.

To learn more, refer to our [Privacy Statement](https://www.elastic.co/legal/product-privacy-statement).
