# Testing

All paths are relative to `x-pack/solutions/security/`.

## Jest unit tests

```sh
yarn test:jest x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/<test_file>
```

Test files: `v1.test.ts`, `fetch_graph.test.ts`, `fetch_events_graph.test.ts`, `fetch_entity_relationships_graph.test.ts`, `parse_records.test.ts`

## FTR tests (API, UI, Serverless)

For running FTR tests, load the `ftr-testing` skill.

**API integration**: `test/cloud_security_posture_api/routes/graph.ts`
Config: `test/cloud_security_posture_api/config.ts`

**UI functional**: `test/cloud_security_posture_functional/pages/`

- `alerts_flyout.ts`, `events_flyout.ts`, `entity_preview_flyout.ts`
  Config: `test/cloud_security_posture_functional/config.ts`

**Serverless functional**: `test/serverless/functional/test_suites/ftr/cloud_security_posture/`

- `graph_alerts_flyout.ts`, `graph_events_flyout.ts`
  Config: `test/serverless/functional/configs/config.cloud_security_posture.complete.ts`

## Test fixtures (es_archives)

- `test/cloud_security_posture_functional/es_archives/entity_store{,_v2}/`
- `test/cloud_security_posture_functional/es_archives/logs_gcp_audit/`
- `test/cloud_security_posture_functional/es_archives/security_alerts_{ecs_only,modified}_mappings/`
- `test/serverless/functional/es_archives/`

## Storybook

```sh
yarn storybook cloud_security_posture_graph
```

## Testing conventions

- ES|QL query tests should be mostly black-box (assert inputs/outputs). Asserting critical ES|QL clauses is acceptable, but avoid testing every implementation detail.
- Test IDs use `TEST_SUBJ_*` constants defined alongside components.
- Unit tests co-located with components (`.test.ts`, `.test.tsx`).
- Storybook stories co-located with components (`.stories.tsx`).
