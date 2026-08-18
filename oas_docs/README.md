# Kibana API reference documentation

Documentation about our OpenAPI bundling workflow and configuration. See Kibana's hosted [stateful](https://www.elastic.co/docs/api/doc/kibana) and [serverless](https://www.elastic.co/docs/api/doc/serverless) docs.

## Workflow

The final goal of this workflow is to produce an OpenAPI bundle containing all Kibana's public APIs.

### Step 0

OAS from Kibana's APIs are continuously extracted and captured in `bundle.json` and `bundle.serverless.json` as fully formed OAS documentation. See `node scripts/capture_oas_snapshot --help` for more info.

These bundles form the basis of our OpenAPI bundles to which we append and layer extra information before publishing.

### Step 1

Append pre-existing bundles not extracted from code using [`kbn-openapi-bundler`](../src/platform/packages/shared/kbn-openapi-bundler/README.md) to produce the final resulting bundles.

To add more files into the final bundle, edit the appropriate `oas_docs/scripts/merge*.js` files.

### Step 2

Apply any final overalys to the document that might include examples or final tweaks (see the ["Scripts"](#scripts) section for more details).

## Scripts

The `oas_docs/scripts` folder contains scripts that point to the source domain-specific OpenAPI bundles and specify additional parameters for producing the final output bundle. Currently, there are the following scripts:

- `merge_ess_oas.js` script produces production an output bundle for ESS

- `merge_serverless_oas.js` script produces production an output bundle for Serverless

### Output Kibana OpenAPI bundles

The `oas_docs/output` folder contains the final resulting Kibana OpenAPI bundles

- `kibana.yaml` production ready ESS OpenAPI bundle
- `kibana.serverless.yaml` production ready Serverless OpenAPI bundle

## Bundling commands

Besides the scripts in the `oas_docs/scripts` folder, there is an `oas_docs/makefile` to simplify the workflow. Use `make help` to see available commands.

## Dashboards & Visualizations — temporary external hosting

> **⚠️ Temporary setup** — see [#266195](https://github.com/elastic/kibana/issues/266195) for the workaround cleanup checklist.

The full Dashboards and Visualizations API references are temporarily hosted at https://elastic.github.io/dashboards-api-spec/ because the primary API documentation cannot render their schemas at this time.

### How the two pipelines differ

| | Bump.sh pipeline (`make api-docs`) | External pipeline (`make api-docs-overlay-external`) |
|---|---|---|
| Dashboards & Visualizations content | Redirect-only shells (links to external docs) | Full schemas |
| Output | `output/kibana.yaml` / `output/kibana.serverless.yaml` | `output/kibana.external.yaml` |
| Run by CI | ✅ | ❌ manual only |

### Keeping external docs in sync

**Every time** the Dashboards or Visualizations API schemas change, the external docs must be manually regenerated and pushed. Otherwise the externally hosted docs will silently drift from the actual API.

Runbook:
```bash
cd oas_docs
make api-docs-overlay-external   # regenerates output/kibana.external.yaml
# copy output/kibana.external.yaml to the elastic/dashboards-api-spec repo and publish
```
