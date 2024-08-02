The `bundle.json` and `bundle.serverless.json` files are generated automatically.
See `node scripts/capture_oas_snapshot --help` for more info.

The `output/kibana.serverless.yaml` file is a temporary OpenAPI document created by joining some manually-maintained files.
To create it and lint it, run `make api-docs` or `make api-docs-serverless` and `make api-docs-lint` or `make api-docs-lint-serverless`.

The `output/kibana.yaml` file is a temporary OpenAPI document created by joining some manually-maintained files.
To create it and lint it, run `make api-docs` or `make api-docs-stateful` and `make api-docs-lint` or `make api-docs-lint-stateful`.