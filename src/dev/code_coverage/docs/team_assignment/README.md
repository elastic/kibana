# Code Coverage Team Assignments

Team assignment occurs once per ci run.

The entry point is a [yaml config](https://buildkite.com/elastic/kibana-code-coverage-main/steps)  
Within the yaml config, [this shell script](https://github.com/elastic/kibana/blob/main/.buildkite/scripts/steps/code_coverage/reporting/ingestData.sh) is used.  
Search for `node scripts/generate_team_assignments.js` and you'll see how it is generated before ingestion begins.  
The generated file's path is passed to the ingestion system via an environment variable: `--teamAssignmentsPath $TEAM_ASSIGN_PATH`  
The ingestion system uses it [here](https://github.com/elastic/kibana/blob/main/src/dev/code_coverage/ingest_coverage/index.js#L33).  

## Team Assignment Parsing (from .github/CODEOWNERS)  
We add additional metadata to the CODEOWNERS file.  
This metadata allows users to assign teams to paths, in a friendly location.  
Example CODEOWNERS Block:  
_notice the coverage delimiter `#CC# ...`_
```
/x-pack/test/functional/es_archives/endpoint/ @elastic/endpoint-app-team @elastic/siem
/x-pack/test/plugin_functional/plugins/resolver_test/ @elastic/endpoint-app-team @elastic/siem
/x-pack/test/plugin_functional/test_suites/resolver/ @elastic/endpoint-app-team @elastic/siem
#CC# /x-pack/legacy/plugins/siem/ @elastic/siem
#CC# /x-pack/plugins/siem/ @elastic/siem
#CC# /x-pack/plugins/security_solution/ @elastic/siem
```
The first 3 lines above fill the usual purpose of the CODEOWNERS file and cause PRs modifying files in these paths to require approval by the listed team(s).  
They also attribute files in those paths for purpose of code coverage reporting.  
The last 3 lines above ONLY attribute files in those paths for purpose of code coverage reporting.  

## Team Assignment Data File Creation (Before Ingestion)
We create a data file containing all paths in the repo, with a team assigned.   
Example Team Assignments Block: 
```
x-pack/plugins/security_solution/common/constants.ts siem
x-pack/plugins/security_solution/common/detection_engine/build_exceptions_query.test.ts siem
x-pack/plugins/security_solution/common/detection_engine/build_exceptions_query.ts siem
...
```

## Team Assignment Data File Usage (During Code Coverage Ingestion) 
Subsequently, we use the data file during ingestion.
We search the data file, for any given "coveredFilePath"
 - Given the above assignments block, and lets say the "coveredFilePath" during ingestion is 
   - `x-pack/plugins/security_solution/common/constants.ts`
   - The team assignment would be `siem` in our [Kibana Stats Cluster](https://kibana-stats.elastic.dev/app/dashboards#/view/58b8db70-62f9-11ea-8312-7f2d69b79843?_g=(filters%3A!()%2CrefreshInterval%3A(pause%3A!t%2Cvalue%3A0)%2Ctime%3A(from%3Anow-7d%2Cto%3Anow)))
