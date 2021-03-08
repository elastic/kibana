
# Massage and Ingest Code Coverage Json Summary and Send to ES 

## Currently, we have 4 indexes 

### 2 for the Code Coverage Job
https://kibana-ci.elastic.co/job/elastic+kibana+code-coverage/
1. kibana_code_coverage
2. kibana_total_code_coverage

### 2 for the R & D Job
https://kibana-ci.elastic.co/job/elastic+kibana+qa-research/
1. qa_research_code_coverage
2. qa_research_total_code_coverage
 
## How it works 

It starts with this jenkins pipeline file:

.ci/Jenkinsfile_coverage#L60

```
src/dev/code_coverage/shell_scripts/ingest_coverage.sh ${BUILD_NUMBER} ${env.BUILD_URL}
```

The ingestion system is hard coded to look for 3 coverage summary files...all json.

From there, an event stream is created, that massages the data to an output format in json that is ingested.

## Configuration

There is really only one config step.  
The index [mapping](./code_coverage_job/kibana_code_coverage_index_mapping.md) for one of
of the indexes has to be manually created.  
Currently, we just add it using Kibana's Dev Tools.