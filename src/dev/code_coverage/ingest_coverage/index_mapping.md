# Create index mapping 

This is usually done in Kibana's dev tools ui.

```
PUT kibana_coverage
{
  "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "branches": {
          "properties": {
            "covered": {
              "type": "long"
            },
            "pct": {
              "type": "long"
            },
            "skipped": {
              "type": "long"
            },
            "total": {
              "type": "long"
            }
          }
        },
        "functions": {
          "properties": {
            "covered": {
              "type": "long"
            },
            "pct": {
              "type": "long"
            },
            "skipped": {
              "type": "long"
            },
            "total": {
              "type": "long"
            }
          }
        },
        "lines": {
          "properties": {
            "covered": {
              "type": "long"
            },
            "pct": {
              "type": "long"
            },
            "skipped": {
              "type": "long"
            },
            "total": {
              "type": "long"
            }
          }
        },
        "path": {
          "type": "text",
          "fields": {
            "keyword": {
              "type": "keyword",
              "ignore_above": 256
            }
          }
        },
        "statements": {
          "properties": {
            "covered": {
              "type": "long"
            },
            "pct": {
              "type": "long"
            },
            "skipped": {
              "type": "long"
            },
            "total": {
              "type": "long"
            }
          }
        }
      }
    }
}
```

_The main portion of the above mapping, is the timestamp-date mapping._