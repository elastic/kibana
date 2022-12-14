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

### trez-8gb-8-5-0

Deployment ID
e6b70b

elastic / Yfze4V92VBY9s4DRNLnPZu0q