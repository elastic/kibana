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
- `tfUnwrap()` (`x-tf-unwrap`) on an object with one required property makes the attribute that property's value,
  as the provider holds it: the XY axis `grid` and `ticks` (`{ visible }`) are booleans, the field statistics table's
  ES|QL `query` (`{ esql }`) is a string. Anything else under that mark is a mapping mistake and throws.
- Sections are a documented special case in `compileDashboardRoot`: the API interleaves sections and panels in
  `panels[]`, while the provider keeps two lists.
- `createDashboardConverter` turns a dashboard in the API's shape into the body of the resource in Terraform JSON
  syntax, with the API paths of the fields it dropped and the panels it skipped. Panels are converted one by one, so
  one unsupported panel does not fail the export. A panel that lost fields is reported as partial (even when it lost
  all of them, so it never reads as fully typed). A panel whose type the resource also accepts as a JSON string
  (`config_json`) falls back to that when its typed conversion fails, and is reported as a JSON-string panel. Every string is escaped (`${` → `$${`, `%{` → `%%{`) so Terraform
  does not evaluate user text as a template. The dashboard plugin's Export → Terraform route calls it.
- `tfRef()` (`x-tf-ref`) marks a string, or a list of strings, as IDs of resources of another type (the dashboard's
  `tags` are `elasticstack_kibana_tag` IDs; `tfDataViewRef()` marks the shared data view IDs: the data view
  reference's `ref_id`, filters, control fields, the AIOps panels and the field statistics table). The converter
  reports each such ID as a reference and keeps it as a literal in the body, also where the ID ends up inside a JSON
  leaf (ADR 0003): the compiler keeps, for each JSON leaf, where references sit in its schema. `linkReferences` then
  writes one resource (pinning no ID; adopting pins it in the flyout) per referenced object it is given and points the
  body at it with `${<type>.<name>.<id attribute>}`, inside a JSON leaf's text too. Generated references are not
  escaped; the objects' text, and the rest of the leaf, are. An ID that also occurs where no reference reaches (the
  converter counts every string it writes, JSON leaves included; for example the deprecated Lens by-value
  `references`) is reported in `unlinkableIds` and stays literal everywhere, so a dashboard is never half-linked. The
  route reads the tags and data views with the user's own saved objects client and gives `linkReferences` only those
  the user can read (and, for tags, that Kibana does not manage), so the rest stay literal IDs. A data view resource is
  mapped by hand (`toDataViewResource`), not from annotations, from the `DataViewSpec` the data views service's
  `savedObjectToSpec` returns, which the route calls so the saved object is parsed as Kibana parses it. The mapping
  only renames onto the provider's `data_view` block: title, name, time field, source filters, field formats, runtime
  fields, field attributes and allow-no-index. It returns the spec paths of the settings the block cannot hold (hidden-index access, rollup type, field format
  parameters it does not type, runtime fields without a script or composite, custom descriptions, scripted fields),
  which the flyout lists as dropped fields on that data view. `TAG_RESOURCE` holds the
  oldest target Kibana the tag resource supports, updated with the provider version.
- At runtime the converter reads `src/dashboard_schemas.oas.json`, the dashboard schemas of the published OpenAPI
  file (the whole file is not shipped with Kibana). `TERRAFORM_PROVIDER` is the provider version the mapping was
  verified against; exports require `>=` it.

When a schema or its mapping changes, regenerate the published files in `oas_docs/output` so the tests here read the
new mapping: `node scripts/capture_oas_snapshot` with the `--include-path` flags of
`.buildkite/scripts/steps/checks/capture_oas_snapshot.sh`, then `make api-docs` in `oas_docs`, then
`node scripts/build_dashboard_terraform_oas` to refresh `src/dashboard_schemas.oas.json`. On a PR, CI does this and
commits the result.
