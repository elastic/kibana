
# Convert Code Coverage Json Summary and Send to ES


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
The index [mapping](src/dev/code_coverage/ingest_coverage/index_mapping.md) for one of
of the indexes has to be manually created.  
Currently, we just add it using Kibana's Dev Tools.