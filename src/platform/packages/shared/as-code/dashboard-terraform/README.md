# @kbn/as-code-dashboard-terraform

Turns the Dashboards API into Terraform for the `elasticstack_kibana_dashboard` resource.

The variant mapping (which union becomes which Terraform attributes) is authored on the Dashboards API Zod schemas with
the `tf*` helpers of `@kbn/zod` (`tfUnion`, `tfVariant`, `tfJsonLeaf`, …), which emit `x-tf-*` keys into Kibana's
published OpenAPI file. This package reads only that document.

- `buildAttributeTree` lists the Terraform attributes and variant-key groups the mapping produces. Its snapshot in
  `src/__snapshots__` covers the whole resource (panels inside sections are checked to repeat `panels[]` instead), so
  every mapping change shows up in review. Update it with
  `node scripts/jest src/platform/packages/shared/as-code/dashboard-terraform -u`.
- A union of objects with no `tfUnion()` mapping, or a property that variants merged into one Terraform object
  define differently, becomes a single JSON-string attribute. That is a decision, not a default:
  `node scripts/check_dashboard_terraform_mapping` fails unless each such location is on
  `src/accepted_json_leaves.json`, and names what to add (or to remove, once a listed location is mapped). `--update` rewrites the list instead of failing;
  the list has its own CODEOWNERS entry, so each new JSON leaf is a reviewed decision. CI runs the check after
  regenerating the OpenAPI files.
- Sections are a documented special case in `compileDashboardRoot`: the API interleaves sections and panels in
  `panels[]`, while the provider keeps two lists.

When a schema or its mapping changes, regenerate the published files in `oas_docs/output` so the tests here read the
new mapping: `node scripts/capture_oas_snapshot` with the `--include-path` flags of
`.buildkite/scripts/steps/checks/capture_oas_snapshot.sh`, then `make api-docs` in `oas_docs`. On a PR, CI does this
and commits the result.
