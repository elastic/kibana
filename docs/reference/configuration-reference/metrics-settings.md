---
navigation_title: "Metrics settings"
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/infrastructure-ui-settings-kb.html
applies_to:
  deployment:
    self: all
---

# Metrics settings in {{kib}} [infrastructure-ui-settings-kb]


You do not need to configure any settings to use the Metrics app in {{kib}}. It is enabled by default.


## General Metrics settings [general-infra-ui-settings-kb]

`xpack.infra.sources.default.fields.message`
:   Deprecated in 8.18. Fields used to display messages in the Logs app. Defaults to `['message', '@message']`.

`xpack.infra.alerting.inventory_threshold.group_by_page_size`
:   Controls the size of the composite aggregations used by the Inventory Threshold to retrieve all the hosts. Defaults to `10_000`.

`xpack.infra.alerting.metric_threshold.group_by_page_size`
:   Controls the size of the composite aggregations used by the Metric Threshold group by feature. Defaults to `10_000`.

