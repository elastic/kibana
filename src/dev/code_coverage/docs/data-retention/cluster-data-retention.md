# Add 90 day data rentention policy
> PUT _ilm/policy/coverage-retention
```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "set_priority": {
            "priority": 100
          }
        },
        "min_age": "0ms"
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
``` 

Settings before ILM
> GET kibana_code_coverage/_settings
```json
{
  "kibana_code_coverage" : {
    "settings" : {
      "index" : {
        "routing" : {
          "allocation" : {
            "include" : {
              "_tier_preference" : "data_content"
            }
          }
        },
        "number_of_shards" : "1",
        "blocks" : {
          "read_only_allow_delete" : "false"
        },
        "provided_name" : "kibana_code_coverage",
        "creation_date" : "1584471429173",
        "number_of_replicas" : "1",
        "uuid" : "XRg56BhkT4ucmrOXZVh0Pg",
        "version" : {
          "created" : "7060199"
        }
      }
    }
  }
}
```

Update dynamic setting:
> PUT kibana_code_coverage/_settings
```json
{
  "settings": {
    "index.lifecycle.name": "coverage-retention" 
  }
}
```