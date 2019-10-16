# Convert Code Coverage Json Summary and Send to ES

## Setup
Run converage using json-summary, put the index, create the index pattern,
and run the converter to post docs to the index.  
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

## Examples  
Run with custom delay 
`DELAY=500 node scripts/convert_and_send_json_summary.js --path target/kibana-coverage/mocha/coverage-summary.json --verbose`  
