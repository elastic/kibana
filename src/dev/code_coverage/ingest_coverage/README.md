
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
   
Mocha  
`DELAY=500 node scripts/ingest_coverage.js --path target/kibana-coverage/mocha/coverage-summary.json --verbose`  

Jest  
`DELAY=500 node scripts/ingest_coverage.js --path target/kibana-coverage/jest/coverage-summary.json --verbose`  

Functional  
```javascript
// First, run the tests with coverage turned on
CODE_COVERAGE=1 node scripts/functional_tests.js --debug

// Then, merge the coverage (more than one report is generated in CI)
nyc report --temp-dir target/kibana-coverage/functional --report-dir target/coverage/report/functional --reporter=json-summary
// or simply 
yarn cover:functional:merge

// Finally, index all the coverage into ES
// merged functional tests coverage
DELAY=40 node scripts/ingest_coverage.js --verbose --path target/coverage/report/functional/coverage-summary.json
// jest
DELAY=10 node scripts/ingest_coverage.js --path target/kibana-coverage/jest/coverage-summary.json --verbose
// mocha
DELAY=0 node scripts/ingest_coverage.js --path target/kibana-coverage/mocha/coverage-summary.json --verbose
```

Run with TIME_STAMP and DISTRO from cli
 - OSS: `time TIME_STAMP=$(node -pe "require('moment')().format()") DELAY=0 node scripts/ingest_coverage.js --verbose --path target/kibana-coverage/mocha/coverage-summary.json` _mocha_
 - X-PACK: `time TIME_STAMP=$(node -pe "require('moment')().format()") DISTRO=x-pack DELAY=0 node scripts/ingest_coverage.js --verbose --path target/coverage/report/functional/coverage-summary.json` _functional_
