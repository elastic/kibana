# Kibana Usage Collection

This plugin registers the Platform Usage Collectors in Kibana.

| Collector name | Description | Extended documentation |
|----------------|:------------|:----------------------:|
| **Application Usage** | Measures how popular an App in Kibana is by reporting the on-screen time and the number of general clicks that happen in it. | [Link](./server/collectors/application_usage/README.md) |
| **Core Metrics** | Collects the usage reported by the core APIs | - |
| **Config Usage** | Reports the non-default values set via `kibana.yml` config file or CLI options. It `[redacts]` any potential PII-sensitive values. | [Link](./server/collectors/config_usage/README.md) |
| **User-changed UI Settings** | Reports all the UI Settings that have been overwritten by the user. It `[redacts]` any potential PII-sensitive values. | [Link](./server/collectors/management/README.md) |
| **CSP configuration** | Reports the key values regarding the CSP configuration. | - |
| **Kibana** | It reports the number of Saved Objects per type. It is limited to `dashboard`, `visualization`, `search`, `index-pattern`, `graph-workspace` and `timelion-sheet`.<br> It exists for legacy purposes, and may still be used by Monitoring via Metricbeat. | - |
| **Saved Objects Counts** | Number of Saved Objects per type. | - |
| **Localization data** | Localization settings: setup locale and installed translation files. | - |
| **Ops stats** | Operation metrics from the system. | - |
| **UI Counters** | Daily aggregation of the number of times an event occurs in the UI. | [Link](../usage_collection/README.mdx#ui-counters) |
| **UI Metrics** | Deprecated. Old form of UI Counters. It reports the _count of the repetitions since the cluster's first start_ of any UI events that may have happened. | - |
| **Usage Counters** | Daily aggregation of the number of times an event occurs on the Server. | [Link](../usage_collection/README.mdx#usage-counters) |
