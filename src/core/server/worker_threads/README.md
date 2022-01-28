## Notes from Meeting with Chris Cowan from Observability
The metric threshold rule has been super optimized and no longer presents a performance problem, so we will have to either artificially slow it down again for our purposes or use log thresholds to test.

Chris also mentioned that in addition to the query and post-processing, [this call](https://github.com/elastic/kibana/blob/ba6be14baa6db9f9716c8746b2c355aa7031d104/x-pack/plugins/infra/server/lib/alerting/metric_threshold/metric_threshold_executor.ts#L58) to actually create the executor also performs some work. It wouldn't hurt to have this happen in the worker as well.

## Load Testing Alerts
### Configure logging event loop performance metrics

Set the following configuration values:
```yml
logging:
  appenders:
    metrics-file:
      type: file
      fileName: ./metrics.log
      layout:
        type: json
  loggers:
  - name: metrics.ops
    appenders: [metrics-file]
    level: debug
```

This will send monitoring data about the event loop delay histogram and event 
loop utilization to the `metrics.json` file. To see max, mean, and utilization 
while Kibana is running run the following:

```sh
tail -f ./metrics.log | jq --unbuffered | grep -e '"max"' -e '"mean"' -e '"utilization"'
```

### Setup
- Start Elasticsearch via `yarn es snapshot --license=trial`
- Start Kibana vi `RUN_RULE_IN_WORKER=true node scripts/kibana --dev --no-watch --no-optimizer` (disabling watch and optimizer to avoid it impacting performance)
- Clone https://github.com/elastic/high-cardinality-cluster
- Run `cd high_cardinality_cluster/high_cardinality_indexer`

### Log Thresholds
- Start indexing high-cardinality logs via the following command. `EVENTS_PER_CYCLE` can be increased to create even more alerts. @simianhacker even suggested setting it to 100,000 for a real stress test.
```
DATASET="fake_logs" EVENTS_PER_CYCLE=10000 INDEX_INTERVAL=10000 ELASTICSEARCH_HOSTS=http://localhost:9200 node src/run.js
``` 
- Open Kibana -> Obervability -> Logs. You should see lots of logs, all with `event.dataset === 'high_cardinality.event'`
- Click "Alerts and rules" -> "Create rule"
- Set it up like so. If you've done it right, you'll get a yellow warning in the UI about perfomance (seen in the screenshot below).
![Setting up log threshold rule](./log-threshold-rule-setup.png)
- Click "Save"
- Visit "Observability" -> "Alerts" and watch them roll in ✅


### Metric Thresholds
**NOTE:** the metric thresholds rule almost certainly won't produce the load we're looking for due to @simianhacker's [recent optimizations](https://github.com/elastic/kibana/pull/121904).
- Start indexing high-cardinality logs via the following command. `EVENTS_PER_CYCLE` can be increased to create even more load.
```
DATASET="fake_hosts" EVENTS_PER_CYCLE=10000 INDEX_INTERVAL=10000 ELASTICSEARCH_HOSTS=http://localhost:9200 node src/run.js
``` 
- Visit "Stack Management" -> "Rulse and Connectors"
- Click "Create rule"
- Set the Metric threshold rule up like so.
![Setting up metric threshold rule](./metric-threshold-rule-setup.png)
- Click "Save"

## Results:
To create a test case to validate the potential benefits of a worker thread we 
reverted portions of https://github.com/elastic/kibana/pull/121904 so that the
metric threshold rule becomes highly CPU bound again. Using the setup 
instructions above we collected the following results:
### Without worker thread:
```
      "max": 16.941055,
      "mean": 11.119625142857144,
        "utilization": 0.3248061049135168
      "max": 24.494079,
      "mean": 11.032530690265485,
        "utilization": 0.3043784938659173
      "max": 20.774911,
      "mean": 11.042870492239468,
        "utilization": 0.28785818343179675
      "max": 20552.089599, <-- Every time the rule runs there's a spike in event loop delay
      "mean": 124.67674095027624,
        "utilization": 0.4279882294260302
```

### With worker threads
Event loop delay stays under 30ms
```
      "max": 25.559039,
      "mean": 11.163056966442953,
        "utilization": 0.05760086472218233
      "max": 25.460735,
      "mean": 11.1344,
        "utilization": 0.0573236975145253
      "max": 12.812287,
      "mean": 11.276584542986425,
        "utilization": 0.05698574561573976
      "max": 25.837567,
      "mean": 11.164979659192825,
        "utilization": 0.05668502730478635
```