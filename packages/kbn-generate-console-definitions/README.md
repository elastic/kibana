# Generate console definitions
This package is a script to generate definitions used in Console to display autocomplete suggestions. 
The definitions files are generated from the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification).
This script is 
a new implementation of an old `kbn-spec-to-console` package: The old script used [JSON specs](https://github.com/elastic/elasticsearch/tree/main/rest-api-spec) in the Elasticsearch repo as the source.

## Instructions
1. Checkout the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification).
2. Run the command `node scripts/generate_console_definitions.js --source <ES_SPECIFICATION_REPO> --emptyDest`
  This command will use the folder `<ES_SPECIFICATION_REPO>` as the source and the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/plugins/console/common/constants/autocomplete_definitions.ts) as the destination. Based on the value of the constant, the autocomplete definitions will be generated in the folder `<KIBANA_REPO>/src/plugins/server/lib/spec_definitions/json/generated`. The flag `--emptyDest` indicates that all existing files in the destination folder will be removed. 
3. It's possible to generate the definitions into a different folder. For that pass an option to the command `--dest <DEFINITIONS_FOLDER>` and also update the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/plugins/console/common/constants/autocomplete_definitions.ts) so that the Console server will load the definitions from this folder. 

## Functionality
This script generates definitions for all endpoints defined in the ES specification at once. 
The script generates fully functional autocomplete definition files with properties as described in the [Console README.md file](https://github.com/elastic/kibana/blob/main/src/plugins/console/README.md) except `data_autocomplete_rules`. Currently, this property needs to be written manually to add autocomplete suggestions for request body parameters.  

