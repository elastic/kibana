The `bundle.json` and `bundle.serverless.json` files are generated automatically.
See `node scripts/capture_oas_snapshot --help` for more info.

The `output/kibana.serverless.yaml` and `output/kibana.yaml` files join some manually-maintained files with the automatically generated files.
To add integrate more files into this bundle, edit the appropriate `oas_docs/scripts/merge*.js` files.
To generate the bundled files, run `make api-docs` (or `make api-docs-serverless` and `make api-docs-stateful`).
To lint them, run `make api-docs-lint` (or `make api-docs-lint-serverless` and `make api-lint-stateful`).

To apply some overlays that perform some post-processing and append some content, run `make api-docs-overlay`.