# Generate console definitions
This package is a script to generate definitions used in Console to display autocomplete suggestions. 
The definitions files are generated from the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification).

## Instructions
1. Checkout the Elasticsearch specification [repo](https://github.com/elastic/elasticsearch-specification).
2. Run the command `node scripts/generate_console_definitions.js --source <ES_SPECIFICATION_REPO> --emptyDest`
  This command will use the folder `<ES_SPECIFICATION_REPO>` as the source and the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/common/constants/autocomplete_definitions.ts) as the destination. Based on the value of the constant, the autocomplete definitions will be generated in the folder `<KIBANA_REPO>/src/platform/plugins/shared/console/server/lib/spec_definitions/json/generated`. The flag `--emptyDest` indicates that all existing files in the destination folder will be removed. After generation, the command verifies that curated overrides do not suppress any new or changed generated rules compared with the approved conflict baseline.
3. It's possible to generate the definitions into a different folder. For that pass an option to the command `--dest <DEFINITIONS_FOLDER>`; the path is resolved relative to the Kibana repo root and used directly (no `generated` subfolder is appended). The generated candidate is still audited against the repository's committed `json/overrides`, since those are the curated rules used at runtime. To make the Console server load definitions from a custom tree, also update the constant [`AUTOCOMPLETE_DEFINITIONS_FOLDER`](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/common/constants/autocomplete_definitions.ts).
4. If the override audit reports a change, review every listed conflict. Fix stale overrides when generated rules are more complete. Only when every difference is intentional, rerun the generation command with `--updateOverrideAudit` and include the resulting [`override_conflict_baseline.json`](./src/override_conflict_baseline.json) change in the review.

The audit can also be run without regenerating definitions:

```sh
node scripts/audit_console_definition_overrides.js
```

The weekly definitions sync only regenerates definitions and opens a PR with generic override-resolution instructions. Override conflicts are enforced in PR CI by the committed-definitions test in [`audit_overrides.test.ts`](./src/audit_overrides.test.ts), which fails until the reviewed baseline is committed. A later weekly run does not update or duplicate an open sync PR; it sends the existing-PR Slack reminder instead.

## Functionality
This script generates definitions for all endpoints defined in the ES specification at once. 
The script generates fully functional autocomplete definition files with properties as described in the [Console README.md file](https://github.com/elastic/kibana/blob/main/src/platform/plugins/shared/console/README.md), including `data_autocomplete_rules` derived from the request body types in the specification. The generator resolves aliases, inherited properties, generic type arguments, object-valued bodies, and typed dictionaries when Console's rule language can represent them. It stays conservative for arbitrary user-defined values, variant-specific union fields, and ordered multi-document formats such as NDJSON. Hand-written definitions in `json/overrides` merge with generated body rules at runtime using the body compiler's structure: ordinary object field maps merge recursively in curated order and append generated-only siblings, while arrays, primitives, and objects containing `__scope_link`, `__one_of`, or `__any_of` are replaced by the curated value. Definitions in `js` load last and replace the whole `data_autocomplete_rules` object for their endpoints.

The override conflict baseline fingerprints generated body parameters that overlap curated values, including whole-body atomic overrides and nested content. A specification update that changes one of those generated values, makes an identical override stale, or resolves an existing conflict causes generation to fail until the change is reviewed. Override files without a matching generated definition always fail the audit because the runtime loader never reads them.
