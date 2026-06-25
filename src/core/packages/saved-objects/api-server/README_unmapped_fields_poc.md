# Saved Objects Unmapped Fields PoC

## Sacred Alignment

This PoC investigates whether ES|QL `SET unmapped_fields="load"` can let Saved Objects avoid selected Elasticsearch mappings for simple schema-on-read query and aggregation use cases.

The target proof is the Alerting v2 rule schedule guardrail: replace the current `find()` terms aggregation over the mapped `schedule.every` field with `savedObjectsRepository.esql()` using unmapped fields, while preserving namespace/type filtering and authorization behavior.

New evidence can reopen this alignment.

## Decisions

- Add a small public Saved Objects ES|QL option named `querySettings.unmappedFields`.
- Core owns the generated `SET unmapped_fields="..."` prefix, just as it already owns the generated `FROM` clause.
- Keep the primitive raw and stateless: callers provide an ES|QL processing pipeline and receive the raw ES|QL response.
- Use Alerting v2 `getTotalScheduledPerMinute()` as the real-world refactor target.
- Remove or bypass the `schedule.every` mapping in the PoC branch so the result proves unmapped-field behavior instead of accidentally relying on an existing mapping.
- Let Elasticsearch reject unsupported ES|QL shapes. Core should reject source commands because it owns `FROM`, but it should not duplicate the ES verifier.

## Non-goals

- Do not retrofit Saved Objects `find()` or `search()` to emulate ES|QL.
- Do not build a general Saved Objects query DSL.
- Do not add a generic aggregation result abstraction.
- Do not solve production removal of mappings from existing `.kibana*` indices.
- Do not claim broad typed schema-on-read support beyond ES|QL `LOAD` behavior.
- Do not support full SO object hydration from ES|QL results beyond the current raw response behavior.

## Feedback Loop

- Tests:
  - Unit test that `performEsql()` generates `SET unmapped_fields="load"; FROM ...`.
  - Core Saved Objects ES|QL integration test with an unmapped attribute queried via `unmappedFields: 'load'`.
  - Alerting v2 service test refactored from mocked `find()` aggregations to mocked `esql()` response parsing.
- Integration/E2E path:
  - No browser or visual verification needed.
  - A full Alerting integration test is optional and should only be added if the unit/Core integration coverage leaves a meaningful gap.
- Manual checks:
  - Run focused Jest/integration tests for the changed Core and Alerting paths.

## Known Limitations

- `unmapped_fields="load"` is ES|QL-only and uses stored `_source`.
- Fully unmapped fields load as `keyword`; richer typing requires casts/conversion and can fail on ambiguity.
- Partially unmapped non-keyword fields are constrained and may need explicit casts/conversion.
- ES currently rejects or limits `LOAD` with `FORK`, subqueries/views, `PROMQL`, full-text functions, and flattened subfield loading.
- This PoC is therefore about avoiding mappings for simple SO analytics predicates and aggregations, not general schema-on-read for all SO queries.

## PoC Result

- `SavedObjectsEsqlOptions.querySettings.unmappedFields` generates `SET unmapped_fields="..."` before the Core-owned `FROM` clause.
- A Core integration test verifies an unmapped Saved Object attribute can be aggregated from `_source` with `unmappedFields: 'load'`.
- Alerting v2 `getTotalScheduledPerMinute()` now uses `savedObjectsClient.esql()` and no longer needs the `schedule.every` mapping/model-version addition.

## Validation

- `node scripts/jest --config=src/core/packages/saved-objects/api-server-internal/jest.config.js src/core/packages/saved-objects/api-server-internal/src/lib/apis/esql.test.ts`
- `node scripts/jest --config=x-pack/platform/plugins/shared/alerting_v2/jest.config.js x-pack/platform/plugins/shared/alerting_v2/server/lib/services/rules_saved_object_service/rules_saved_object_service.test.ts`
- `node scripts/jest_integration src/core/server/integration_tests/saved_objects/service/lib/esql.test.ts`
- `node scripts/type_check --project src/core/packages/saved-objects/api-server/tsconfig.json`
- `node scripts/type_check --project src/core/packages/saved-objects/api-server-internal/tsconfig.json`
- `node scripts/eslint --fix $(git diff --name-only)`

## Open Questions

- None for the initial PoC. Production mapping-removal strategy is intentionally deferred.

## Ready To Chunk

- [x] User approved this artifact.
- [x] Feedback loop is credible.
- [x] Open questions are either resolved or intentionally deferred to human-ready issues.
