
# Massage and Ingest Code Coverage Json Summary and Send to ES 

## Currently, we have 2 indexes 

### 2 for the Code Coverage Job
https://buildkite.com/elastic/kibana-code-coverage-main
1. kibana_code_coverage
2. kibana_total_code_coverage

## How it works 

It starts with buildkite

At the time of this writing, the code coverage job steps are:
```yaml
env:
  CODE_COVERAGE: '1'
  NODE_ENV: 'test'
  DISABLE_MISSING_TEST_REPORT_ERRORS: 'true'
steps:

#  .. MYRIAD STEPS BEFORE CODE COVERAGE BEGINS ..
    
  - command: .buildkite/scripts/steps/code_coverage/ingest.sh
    label: 'Merge and Ingest'
    agents:
      queue: n2-4
    depends_on:
      - jest
      - oss-cigroup
      - default-cigroup
    timeout_in_minutes: 60
    key: ingest
          
  - wait: ~
    continue_on_failure: true

```

At the end of `.buildkite/scripts/steps/code_coverage/ingest.sh` is:
`echo "--- Ingest results to Kibana stats cluster"`.
The code that comes after that echo statement starts the process.

## Configuration

There is really only one config step.  
The index [mapping](./code_coverage_job/kibana_code_coverage_index_mapping.md) for one of
of the indexes has to be manually created.  
Currently, we just add it using Kibana's Dev Tools.