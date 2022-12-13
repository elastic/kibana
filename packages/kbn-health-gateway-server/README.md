# @kbn/health-gateway-server

This package runs a small server called the Health Gateway, which exists to
check the health of multiple Kibana instances and return an aggregated result.

This is used by the Elastic Cloud infrastructure to run two different Kibana processes
with different `node.roles`: one process for handling UI requests, and one for background
tasks.

## Configuration

Similar to Kibana, the gateway has a yml configuration file that it reads from. By default
this lives alongside the `kibana.yml` at `<REPO_ROOT>/config/gateway.yml`. Like Kibana,
you can provide a `-c` or `--config` CLI argument to override the location of the config
file.

For example:

```bash
$ yarn start --config /path/to/some/other/config.yml
```

Here is a sample configuration file recommended for use in development:

```yaml
# config/gateway.yml
server:
  port: 3000
  host: 'localhost'
  ssl:
    enabled: true
    # Using Kibana test certs
    key: /path/to/packages/kbn-dev-utils/certs/kibana.key
    certificate: /path/to/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: /path/to/packages/kbn-dev-utils/certs/ca.crt

kibana:
  hosts:
    - 'https://localhost:5605'
    - 'https://localhost:5606'
  ssl:
    # Using Kibana test certs
    certificate: /path/to/packages/kbn-dev-utils/certs/kibana.crt
    certificateAuthorities: /path/to/packages/kbn-dev-utils/certs/ca.crt
    verificationMode: certificate

logging:
  root:
    appenders: ['console']
    level: 'all'
```

Note that the gateway supports the same logging configuration as Kibana, including
all of the same appenders.

## Development & Testing

To run this locally, first you need to create a `config/gateway.yml` file. There's a
`docker-compose.yml` intended for development, which will run Elasticsearch and
two different Kibana instances for testing. Before using it, you'll want to create
a `.env` file:

```bash
# From the /packages/kbn-health-gateway-server/scripts directory
$ cp .env.example .env
# (modify the .env settings if desired)
$ docker-compose up
```

This will automatically run Kibana on the ports from the sample `gateway.yml`
above (5605-5606).

Once you have your `gateway.yml` and have started docker-compose, you can run the
server from the `/packages/kbn-health-gateway-server` directory with `yarn start`. Then you should
be able to make requests to the `/` endpoint:

```bash
$ curl "https://localhost:3000/"
```

## Cloud Testing

per https://github.com/elastic/kibana/issues/147017

### tre-1-gb-8.6 w/ Stack Monitoring

AWS us-east n. virginia

elastic / AElnYXrxGNnZkzavNB8jdIpx

cluster id:
44859b6634fc4b86b16498bd22793446

deployment id:
95c359

### tre-8-gb-8.6 w/ Stack Monitoring

AWS europe central 1 Frankfurt

elastic / WHkRXcj5kEqTHBN06pFoGFwC

cluster id:
76f3e1c2de9d4010940224e1aea0cd67

### 1gb-az-us-east-2

elastic / llgX7JNSc7lzy98dE6B7A6yG

> https://trez-1gb.kb.eastus2.staging.azure.foundit.no:9243/api/task_manager/_health

```json
{
  "id": "13517338-a7ce-4615-81e0-1702d130fa55",
  "timestamp": "2022-12-13T11:07:48.954Z",
  "status": "OK",
  "last_update": "2022-12-13T11:07:47.051Z",
  "stats": {
    "configuration": {
      "timestamp": "2022-12-13T11:05:12.966Z",
      "value": {
        "request_capacity": 1000,
        "max_poll_inactivity_cycles": 10,
        "monitored_aggregated_stats_refresh_rate": 60000,
        "monitored_stats_running_average_window": 50,
        "monitored_task_execution_thresholds": {
          "default": { "error_threshold": 90, "warn_threshold": 80 },
          "custom": {}
        },
        "poll_interval": 3000,
        "max_workers": 10
      },
      "status": "OK"
    },
    "runtime": {
      "timestamp": "2022-12-13T11:07:47.051Z",
      "value": {
        "polling": {
          "last_successful_poll": "2022-12-13T11:07:46.982Z",
          "last_polling_delay": "2022-12-13T11:05:13.849Z",
          "claim_duration": { "p50": 10, "p90": 49.5, "p95": 53, "p99": 55 },
          "duration": { "p50": 114.5, "p90": 164, "p95": 209, "p99": 1217 },
          "claim_conflicts": { "p50": 0, "p90": 0, "p95": 0, "p99": 0 },
          "claim_mismatches": { "p50": 0, "p90": 0, "p95": 0, "p99": 0 },
          "result_frequency_percent_as_number": {
            "Failed": 0,
            "NoAvailableWorkers": 0,
            "NoTasksClaimed": 96,
            "RanOutOfCapacity": 0,
            "RunningAtCapacity": 0,
            "PoolFilled": 4
          },
          "persistence": { "recurring": 97, "non_recurring": 3 }
        },
        "drift": { "p50": 3069, "p90": 160752.8, "p95": 165629.39999999997, "p99": 199820 },
        "drift_by_type": {
          "endpoint:user-artifact-packager": {
            "p50": 2980,
            "p90": 160745,
            "p95": 160745,
            "p99": 160745
          },
          "reports:monitor": { "p50": 3068, "p90": 3153, "p95": 42563.999999999854, "p99": 199820 },
          "alerts_invalidate_api_keys": {
            "p50": 166831,
            "p90": 166831,
            "p95": 166831,
            "p99": 166831
          },
          "security:endpoint-diagnostics": {
            "p50": 160823,
            "p90": 160823,
            "p95": 160823,
            "p99": 160823
          },
          "dashboard_telemetry": { "p50": 5362, "p90": 5362, "p95": 5362, "p99": 5362 },
          "ML:saved-objects-sync": { "p50": 4166, "p90": 4166, "p95": 4166, "p99": 4166 },
          "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
            "p50": 5170,
            "p90": 5170,
            "p95": 5170,
            "p99": 5170
          }
        },
        "load": { "p50": 10, "p90": 16.999999999999993, "p95": 30.99999999999998, "p99": 40 },
        "execution": {
          "duration": {
            "endpoint:user-artifact-packager": { "p50": 8, "p90": 16, "p95": 16, "p99": 16 },
            "reports:monitor": {
              "p50": 6,
              "p90": 7.900000000000002,
              "p95": 14.79999999999999,
              "p99": 26
            },
            "alerts_invalidate_api_keys": { "p50": 33, "p90": 33, "p95": 33, "p99": 33 },
            "security:endpoint-diagnostics": { "p50": 535, "p90": 535, "p95": 535, "p99": 535 },
            "dashboard_telemetry": { "p50": 604, "p90": 604, "p95": 604, "p99": 604 },
            "ML:saved-objects-sync": { "p50": 996, "p90": 996, "p95": 996, "p99": 996 },
            "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
              "p50": 1195,
              "p90": 1195,
              "p95": 1195,
              "p99": 1195
            }
          },
          "duration_by_persistence": {
            "recurring": {
              "p50": 6,
              "p90": 133.39999999999964,
              "p95": 926.849999999999,
              "p99": 1195
            },
            "non_recurring": { "p50": 604, "p90": 604, "p95": 604, "p99": 604 }
          },
          "persistence": { "recurring": 97, "non_recurring": 3, "ephemeral": 0 },
          "result_frequency_percent_as_number": {
            "endpoint:user-artifact-packager": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "reports:monitor": { "Success": 100, "RetryScheduled": 0, "Failed": 0, "status": "OK" },
            "alerts_invalidate_api_keys": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "security:endpoint-diagnostics": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "dashboard_telemetry": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "ML:saved-objects-sync": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            }
          }
        }
      },
      "status": "OK"
    },
    "workload": {
      "timestamp": "2022-12-13T11:07:13.867Z",
      "value": {
        "count": 28,
        "task_types": {
          "Fleet-Usage-Logger": { "count": 1, "status": { "idle": 1 } },
          "Fleet-Usage-Sender": { "count": 1, "status": { "idle": 1 } },
          "ML:saved-objects-sync": { "count": 1, "status": { "idle": 1 } },
          "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
            "count": 1,
            "status": { "idle": 1 }
          },
          "actions_telemetry": { "count": 1, "status": { "idle": 1 } },
          "alerting_health_check": { "count": 1, "status": { "idle": 1 } },
          "alerting_telemetry": { "count": 1, "status": { "idle": 1 } },
          "alerts_invalidate_api_keys": { "count": 1, "status": { "idle": 1 } },
          "apm-telemetry-task": { "count": 1, "status": { "idle": 1 } },
          "cases-telemetry-task": { "count": 1, "status": { "idle": 1 } },
          "cleanup_failed_action_executions": { "count": 1, "status": { "idle": 1 } },
          "dashboard_telemetry": { "count": 1, "status": { "idle": 1 } },
          "endpoint:metadata-check-transforms-task": { "count": 1, "status": { "idle": 1 } },
          "endpoint:user-artifact-packager": { "count": 1, "status": { "idle": 1 } },
          "fleet:check-deleted-files-task": { "count": 1, "status": { "idle": 1 } },
          "osquery:telemetry-configs": { "count": 1, "status": { "idle": 1 } },
          "osquery:telemetry-packs": { "count": 1, "status": { "idle": 1 } },
          "osquery:telemetry-saved-queries": { "count": 1, "status": { "idle": 1 } },
          "reports:monitor": { "count": 1, "status": { "idle": 1 } },
          "security:endpoint-diagnostics": { "count": 1, "status": { "idle": 1 } },
          "security:endpoint-meta-telemetry": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-configuration": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-detection-rules": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-filterlist-artifact": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-lists": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-prebuilt-rule-alerts": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-timelines": { "count": 1, "status": { "idle": 1 } },
          "session_cleanup": { "count": 1, "status": { "idle": 1 } }
        },
        "non_recurring": 28,
        "owner_ids": 0,
        "schedule": [
          ["3s", 1],
          ["60s", 1],
          ["5m", 3],
          ["15m", 1],
          ["45m", 1],
          ["1h", 4],
          ["60m", 2],
          ["3600s", 1],
          ["2h", 1],
          ["3h", 1],
          ["720m", 2],
          ["24h", 6],
          ["1d", 1]
        ],
        "overdue": 0,
        "overdue_non_recurring": 0,
        "estimated_schedule_density": [
          1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ],
        "capacity_requirements": { "per_minute": 21, "per_hour": 48, "per_day": 31 }
      },
      "status": "OK"
    },
    "capacity_estimation": {
      "status": "OK",
      "timestamp": "2022-12-13T11:07:48.954Z",
      "value": {
        "observed": {
          "observed_kibana_instances": 1,
          "max_throughput_per_minute_per_kibana": 200,
          "max_throughput_per_minute": 200,
          "minutes_to_drain_overdue": 0,
          "avg_recurring_required_throughput_per_minute": 22,
          "avg_recurring_required_throughput_per_minute_per_kibana": 22,
          "avg_required_throughput_per_minute": 24,
          "avg_required_throughput_per_minute_per_kibana": 24
        },
        "proposed": {
          "provisioned_kibana": 1,
          "min_required_kibana": 1,
          "avg_recurring_required_throughput_per_minute_per_kibana": 22,
          "avg_required_throughput_per_minute_per_kibana": 24
        }
      }
    }
  }
}
```

### 8gb-az-us-east-2

elastic / AtRD310pcvA95MwztZJcNH7L
