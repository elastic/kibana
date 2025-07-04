---
navigation_title: "Logs settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/logs-ui-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Logs settings in {{kib}} [logs-ui-settings-kb]


You do not need to configure any settings to use the Logs app in {{kib}}. It is enabled by default.

The {{kib}} logs can be found per operating system under:

* Linux, DEB or RPM package: /var/log/kibana/kibana.log
* Linux, tar.gz package: $KIBANA_HOME/log/kibana.log
* Windows: $KIBANA_HOME\log\kibana.log


## General Logs settings [general-logs-ui-settings-kb]

`xpack.infra.sources.default.fields.message`
:   Fields used to display messages in the Logs app. Defaults to `['message', '@message']`.

`xpack.infra.alerting.inventory_threshold.group_by_page_size`
:   Controls the size of the composite aggregations used by the Inventory Threshold to retrieve all the hosts. Defaults to `10_000`.

`xpack.infra.alerting.metric_threshold.group_by_page_size`
:   Controls the size of the composite aggregations used by the Metric Threshold group by feature. Defaults to `10_000`.

