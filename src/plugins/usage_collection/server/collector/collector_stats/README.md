## Collector Stats Collector

The `usage_collector_stats` collector adds telemetry around the execution duration grabbing usage and the status of the collectors:
- Total number and names of collectors that return `true` from `isReady`
- Total number and names of collectors that return `false` from from `isReady`
- Total number and names of collectors that timeout from from `isReady`
- Total number and names of ready collectors that successfully return data from `fetch`
- Total number and names of ready collectors that fail to return data from `fetch`
- Total execution duration to grab all collectors
- Total execution duration to get the `isReady` state of each collector
- Total execution duration to get the `fetch` objects from each collector
- Breakdown per collector type with details on the execution duration for `fetch` and `isReady`

The overall durations show the overall health of the collection mechanism, while the breakdown objects help diagnose specific collectors and improve upon them.

## Why is this in telemetry and not in CI?
Adding limits and checks in CI is a good idea for catching early issues. Collecting these metrics via telemetry will also help us identify bottlenecks against real-world use cases from Kibanas in the wild.

## What does the usage collector stats look like?

The collector can be found under `stack_stats.kibana.plugins.usage_collector_stats` and looks like this:

```json
"usage_collector_stats": {
  "not_ready": {
    "count": 1,
    "names": [
      "cloud_provider"
    ]
  },
  "not_ready_timeout": {
    "count": 0,
    "names": []
  },
  "succeeded": {
    "count": 54,
    "names": [
      "task_manager",
      "ui_counters",
      "usage_counters",
      "kibana_stats",
      "kibana",
      ...
    ]
  },
  "failed": {
    "count": 0,
    "names": []
  },
  "total_is_ready_duration": 0.07500024700000003,
  "total_fetch_duration": 0.35939233100000006,
  "total_duration": 0.4343925780000001,
  "is_ready_duration_breakdown": {
    { "name": "task_manager", "duration": 0.001828041 },
    { "name": "ui_counters", "duration": 0.001790625 },
    { "name": "usage_counters", "duration": 0.001778125 },
    { "name": "kibana_stats", "duration": 0.001764709 },
    { "name": "kibana", "duration": 0.001748917 },
    ...
  },
  "fetch_duration_breakdown": {
    { "name": "task_manager", "duration": 0.011157708 },
    { "name": "ui_counters", "duration": 0.011002625 },
    { "name": "usage_counters", "duration": 0.009945833 },
    { "name": "kibana_stats", "duration": 0.009424458 },
    { "name": "kibana", "duration": 0.009406416 },
    ...
  }
}
```