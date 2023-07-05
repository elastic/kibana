# Generate console definitions
This package is a script to generate definitions used in Console to display autocomplete suggestions. The script is 
a new implementation of `kbn-spec-to-console` package: The old script uses [JSON specs](https://github.com/elastic/elasticsearch/tree/main/rest-api-spec) from the Elasticsearch repo as the source, whereas this script uses the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification) as the source.

## Instructions
1. Checkout the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification).
2. Run the command `node scripts/generate_console_definitions.js --source <ES_SPECIFICATION_REPO> --emptyDest`
  This command will use the folder `<ES_SPECIFICATION_REPO>` as the source and the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/plugins/console/common/constants/autocomplete_definitions.ts) as the destination. Based on the value of the constant, the autocomplete definitions will be generated in the folder `<KIBANA_REPO>/src/plugins/server/lib/spec_definitions/json/generated`. Using the flag `--emptyDest` will remove any existing files in the destination folder. 
3. It's possible to generate the definitions into a different folder. For that pass an option to the command `--dest <DEFINITIONS_FOLDER>` and also update the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/plugins/console/common/constants/autocomplete_definitions.ts) so that the Console server will load the definitions from this folder. 

