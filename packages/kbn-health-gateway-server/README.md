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

## Local Testing

### Load up the local cluster with rules, alerts and connectors

```sh
$ pushd MACHINE-LEARNING-QA-REPO
$ ./gradlew :env-bootstrap:runSuite -Dsuite=rac100 -Dstack.es_port=9205 -Dstack.kibana_port=5605 -Dstack.username=elastic -Dstack.password=changeme
```

> In my case, this was using docker compose locally

## Cloud Testing

per https://github.com/elastic/kibana/issues/147017

### trez-8gb

elastic / PH5sRsuSsieD0sVDBXznC3hn

> https://trez-8gb.kb.eastus2.staging.azure.foundit.no:9243/api/task_manager/_health

It does NOT have the `stats.runtime` stanza.

```json
{
  "id": "8c3c18ad-fb90-4ecc-bf65-abfd0f8ab146",
  "timestamp": "2022-12-13T14:44:23.748Z",
  "status": "OK",
  "last_update": "2022-12-13T14:44:15.556Z",
  "stats": {
    "configuration": {
      "timestamp": "2022-12-13T14:42:13.175Z",
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
    "workload": {
      "timestamp": "2022-12-13T14:44:15.556Z",
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
          1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1
        ],
        "capacity_requirements": { "per_minute": 21, "per_hour": 48, "per_day": 31 }
      },
      "status": "OK"
    }
  }
}
```

## QA Env

### trez-8gb-8.6.0

> https://trez-8gb-8-6-0.kb.eu-west-1.aws.qa.cld.elstc.co:9243/api/task_manager/_health

Deployment ID
33fbdb

elastic / H6dnMBSWYfRnXZu5sREtJ5aL

### trez-qa-monitoring-8-6-0

Deployment ID
a00ca0

elastic / l4hwHttEX7TwH0YXmOJ6Uw2Q

### trez-8gb-8-5-0-to-8-6-0

Deployment ID
e6b70b

elastic / Yfze4V92VBY9s4DRNLnPZu0q

#### While still on 8.5.0

> https://trez-8gb-8-5-0-to-8-6-0.kb.eu-west-1.aws.qa.cld.elstc.co:9243/api/task_manager/_health

As expected, the `stats.runtime` is present.  
It should not be after I upgrade.

```json
{
  "id": "38141ea6-e0ff-4106-be68-60449ab642dc",
  "timestamp": "2022-12-14T16:27:37.078Z",
  "status": "OK",
  "last_update": "2022-12-14T16:27:35.649Z",
  "stats": {
    "configuration": {
      "timestamp": "2022-12-14T15:23:10.584Z",
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
      "timestamp": "2022-12-14T16:27:35.649Z",
      "value": {
        "polling": {
          "last_successful_poll": "2022-12-14T16:27:35.590Z",
          "last_polling_delay": "2022-12-14T15:23:11.309Z",
          "claim_duration": { "p50": 6, "p90": 28.5, "p95": 30, "p99": 36 },
          "duration": { "p50": 90, "p90": 108.5, "p95": 115, "p99": 163 },
          "claim_conflicts": { "p50": 0, "p90": 0, "p95": 0, "p99": 0 },
          "claim_mismatches": { "p50": 0, "p90": 0, "p95": 0, "p99": 0 },
          "result_frequency_percent_as_number": {
            "Failed": 0,
            "NoAvailableWorkers": 0,
            "NoTasksClaimed": 76,
            "RanOutOfCapacity": 0,
            "RunningAtCapacity": 0,
            "PoolFilled": 24
          },
          "persistence": { "recurring": 100, "non_recurring": 0 }
        },
        "drift": { "p50": 3047, "p90": 3073.5, "p95": 3076, "p99": 3118 },
        "drift_by_type": {
          "reports:monitor": { "p50": 3058, "p90": 3090.5, "p95": 3118, "p99": 3265 },
          "search_sessions_monitor": { "p50": 2057, "p90": 2069, "p95": 2079, "p99": 2101 },
          "endpoint:user-artifact-packager": {
            "p50": 2994,
            "p90": 3020.5,
            "p95": 3029,
            "p99": 3143
          },
          "search_sessions_cleanup": { "p50": 3056.5, "p90": 3078.5, "p95": 3083, "p99": 3148 },
          "alerts_invalidate_api_keys": {
            "p50": 3058,
            "p90": 3738.600000000003,
            "p95": 5690.549999999998,
            "p99": 6141
          },
          "dashboard_telemetry": { "p50": 1393, "p90": 1393, "p95": 1393, "p99": 1393 },
          "search_sessions_expire": { "p50": 1024, "p90": 1951, "p95": 1951, "p99": 1951 },
          "ML:saved-objects-sync": { "p50": 2223, "p90": 3037, "p95": 3037, "p99": 3037 },
          "security:endpoint-diagnostics": {
            "p50": 3058,
            "p90": 3739.4000000000033,
            "p95": 5690.699999999999,
            "p99": 6141
          },
          "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
            "p50": 3057,
            "p90": 3139.3999999999996,
            "p95": 3143.9500000000003,
            "p99": 3145
          },
          "security:telemetry-configuration": { "p50": 166.5, "p90": 185, "p95": 185, "p99": 185 },
          "cleanup_failed_action_executions": { "p50": 209, "p90": 209, "p95": 209, "p99": 209 },
          "alerting_health_check": { "p50": 209, "p90": 209, "p95": 209, "p99": 209 },
          "endpoint:metadata-check-transforms-task": {
            "p50": 2575,
            "p90": 2575,
            "p95": 2575,
            "p99": 2575
          },
          "security:telemetry-prebuilt-rule-alerts": {
            "p50": 144,
            "p90": 144,
            "p95": 144,
            "p99": 144
          },
          "session_cleanup": { "p50": 190, "p90": 190, "p95": 190, "p99": 190 }
        },
        "load": { "p50": 10, "p90": 15, "p95": 20, "p99": 20 },
        "execution": {
          "duration": {
            "reports:monitor": { "p50": 4, "p90": 6, "p95": 8, "p99": 19 },
            "search_sessions_monitor": { "p50": 4, "p90": 6, "p95": 6, "p99": 8 },
            "endpoint:user-artifact-packager": { "p50": 4, "p90": 7.5, "p95": 9, "p99": 16 },
            "search_sessions_cleanup": { "p50": 5, "p90": 7, "p95": 11, "p99": 664 },
            "alerts_invalidate_api_keys": {
              "p50": 9,
              "p90": 16.400000000000023,
              "p95": 30.699999999999992,
              "p99": 34
            },
            "dashboard_telemetry": { "p50": 34, "p90": 34, "p95": 34, "p99": 34 },
            "search_sessions_expire": { "p50": 21.5, "p90": 35, "p95": 35, "p99": 35 },
            "ML:saved-objects-sync": { "p50": 89.5, "p90": 108, "p95": 108, "p99": 108 },
            "security:endpoint-diagnostics": { "p50": 424, "p90": 510.6, "p95": 554.8, "p99": 565 },
            "UPTIME:SyntheticsService:Sync-Saved-Monitor-Objects": {
              "p50": 383,
              "p90": 410.6,
              "p95": 415.8,
              "p99": 417
            },
            "security:telemetry-configuration": { "p50": 361, "p90": 384, "p95": 384, "p99": 384 },
            "cleanup_failed_action_executions": { "p50": 20, "p90": 20, "p95": 20, "p99": 20 },
            "alerting_health_check": { "p50": 46, "p90": 46, "p95": 46, "p99": 46 },
            "endpoint:metadata-check-transforms-task": {
              "p50": 16,
              "p90": 16,
              "p95": 16,
              "p99": 16
            },
            "security:telemetry-prebuilt-rule-alerts": {
              "p50": 428,
              "p90": 428,
              "p95": 428,
              "p99": 428
            },
            "session_cleanup": { "p50": 11, "p90": 11, "p95": 11, "p99": 11 }
          },
          "duration_by_persistence": {
            "recurring": { "p50": 4, "p90": 6, "p95": 6, "p99": 664 },
            "non_recurring": { "p50": 34, "p90": 34, "p95": 34, "p99": 34 }
          },
          "persistence": { "recurring": 100, "non_recurring": 0, "ephemeral": 0 },
          "result_frequency_percent_as_number": {
            "reports:monitor": { "Success": 100, "RetryScheduled": 0, "Failed": 0, "status": "OK" },
            "search_sessions_monitor": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "endpoint:user-artifact-packager": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "search_sessions_cleanup": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "alerts_invalidate_api_keys": {
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
            "search_sessions_expire": {
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
            "security:endpoint-diagnostics": {
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
            },
            "security:telemetry-configuration": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "cleanup_failed_action_executions": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "alerting_health_check": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "endpoint:metadata-check-transforms-task": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "security:telemetry-prebuilt-rule-alerts": {
              "Success": 100,
              "RetryScheduled": 0,
              "Failed": 0,
              "status": "OK"
            },
            "session_cleanup": { "Success": 100, "RetryScheduled": 0, "Failed": 0, "status": "OK" }
          }
        }
      },
      "status": "OK"
    },
    "workload": {
      "timestamp": "2022-12-14T16:27:11.323Z",
      "value": {
        "count": 27,
        "task_types": {
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
          "osquery:telemetry-configs": { "count": 1, "status": { "idle": 1 } },
          "osquery:telemetry-packs": { "count": 1, "status": { "idle": 1 } },
          "osquery:telemetry-saved-queries": { "count": 1, "status": { "idle": 1 } },
          "reports:monitor": { "count": 1, "status": { "idle": 1 } },
          "search_sessions_cleanup": { "count": 1, "status": { "idle": 1 } },
          "search_sessions_expire": { "count": 1, "status": { "idle": 1 } },
          "search_sessions_monitor": { "count": 1, "status": { "idle": 1 } },
          "security:endpoint-diagnostics": { "count": 1, "status": { "idle": 1 } },
          "security:endpoint-meta-telemetry": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-configuration": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-detection-rules": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-lists": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-prebuilt-rule-alerts": { "count": 1, "status": { "idle": 1 } },
          "security:telemetry-timelines": { "count": 1, "status": { "idle": 1 } },
          "session_cleanup": { "count": 1, "status": { "idle": 1 } }
        },
        "non_recurring": 27,
        "owner_ids": 0,
        "schedule": [
          ["10s", 1],
          ["60s", 2],
          ["5m", 3],
          ["1h", 2],
          ["3600s", 2],
          ["60m", 2],
          ["2h", 1],
          ["3h", 1],
          ["720m", 2],
          ["24h", 6]
        ],
        "overdue": 2,
        "overdue_non_recurring": 2,
        "estimated_schedule_density": [
          2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0,
          0, 3, 1, 0, 0, 0, 1, 0, 0, 0
        ],
        "capacity_requirements": { "per_minute": 8, "per_hour": 42, "per_day": 30 }
      },
      "status": "OK"
    },
    "capacity_estimation": {
      "status": "OK",
      "timestamp": "2022-12-14T16:27:37.078Z",
      "value": {
        "observed": {
          "observed_kibana_instances": 1,
          "max_throughput_per_minute_per_kibana": 200,
          "max_throughput_per_minute": 200,
          "minutes_to_drain_overdue": 2,
          "avg_recurring_required_throughput_per_minute": 9,
          "avg_recurring_required_throughput_per_minute_per_kibana": 9,
          "avg_required_throughput_per_minute": 9,
          "avg_required_throughput_per_minute_per_kibana": 9
        },
        "proposed": {
          "provisioned_kibana": 1,
          "min_required_kibana": 1,
          "avg_recurring_required_throughput_per_minute_per_kibana": 9,
          "avg_required_throughput_per_minute_per_kibana": 9
        }
      }
    }
  }
}
```
