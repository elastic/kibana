# Kibana API reference documentation

Documentation about our OpenAPI bundling workflow and configuration.
The finalized OpenAPI documents are published to [Kibana API](https://www.elastic.co/docs/api/doc/kibana) and [Kibana Serverless API](https://www.elastic.co/docs/api/doc/serverless) documentation.

## Workflow

The final goal of this workflow is to produce an OpenAPI bundle containing all Kibana's public APIs.

### Step 0

Kibana OpenAPI specifications are extracted from the code by `@kbn/capture-oas-snapshot-cli`.
In particular, it captures information about HTTP APIs that use the following components:

1. The Kibana Core `router` or `router.versioned` methods for defining HTTP APIs provided via the `core.http` service to all plugins
1. Either `@kbn/config-schema` or `@kbn/zod` request and response schemas.

For more information about generating this snapshot, run `node scripts/capture_oas_snapshot --help`.

Per [capture_oas_snapshot.sh](https://github.com/elastic/kibana/blob/main/.buildkite/scripts/steps/checks/capture_oas_snapshot.sh), OpenAPI snapshots are captured automatically for a specific list of endpoints.
The results are stored in `oas_docs/bundle.json` and `oas_docs/bundle.serverless.json`.
These bundles form the basis of our Kibana OpenAPI documents to which we append and layer extra information before publishing.

NOTE: The `capture_oas_snapshot` script also validates the output files using `@kbn/validate-oas`.
To see the validation results locally, run `node scripts/validate_oas_docs.js`.

### Step 1

Information about some APIs cannot be extracted from code.
In those cases, details exist in separate OpenAPI documents that are bundled together using [`kbn-openapi-bundler`](../src/platform/packages/shared/kbn-openapi-bundler/README.md).

The following scripts list all the OpenAPI files that are bundled to produce the final output Kibana OpenAPI documents:

- [merge_ess_oas.js](https://github.com/elastic/kibana/blob/main/oas_docs/scripts/merge_ess_oas.js)
- [merge_serverless_oas.js](https://github.com/elastic/kibana/blob/main/oas_docs/scripts/merge_serverless_oas.js)

Each of the OpenAPI documents listed in those scripts might have unique details about how it is generated and maintained.
Refer to the readmes in each file path.
To add more files into these documents, edit the appropriate `oas_docs/scripts/merge*.js` files.

Per [final_merge.sh](https://github.com/elastic/kibana/blob/main/.buildkite/scripts/steps/openapi_bundling/final_merge.sh), the final OpenAPI documents are automatically bundled and stored in the `oas_docs/output` folder.

## Make commands

There is an `oas_docs/makefile` that contains commands that simplify the workflow.
You can also use these commands locally to generate or lint the files.
Use `make help` to see available commands.
