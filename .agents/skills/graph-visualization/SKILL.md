---
name: graph-visualization
description: Use when working on the Graph Visualization feature in Security Solution - entity/label/relationship nodes, graph API, @xyflow components, ES|QL queries, entity store, or license gating.
---

# Graph Visualization

Security event visualization using an Actor-Action-Target model. Entities (users, hosts, services, etc.) are nodes connected by label nodes (events/alerts) and relationship nodes (entity store relationships). Accessible in Security flyouts (Hosts, Users, Network events + Alerts) when events contain the required actor, action, and target fields.

## Domain model

Events follow an **Actor-Action-Target** model:

- **Actor**: the entity that performs the action. Resolved by priority: `user.entity.id` > `host.entity.id` > `service.entity.id` > `entity.id`. Only one actor per event (first match wins, but the field may have multiple values).
- **Action**: `event.action` — the operation performed (e.g. "ConsoleLogin", "AssumeRole").
- **Targets**: all `*.target.entity.id` / `entity.target.id` fields are included (no priority, multiple supported). Each target becomes a separate node.

An event renders in the graph only when it has at least one actor field, `event.action`, and at least one target field.

## Node types

- **Entity nodes**: 5 shapes mapped by entity type in `entity_type_constants.ts` (45+ types). Ellipse=user, hexagon=cloud resource, rectangle=host/container, diamond=network, pentagon=other. Grouped entities are rendered as entity nodes showing an entities count.
- **Label nodes**: connectors between entities representing events/alerts. Color: `danger`=alerts, `primary`=events. Grouped events are rendered as label nodes showing an events count and an alerts count. Support stacked display when count > 2.
- **Relationship nodes**: connectors from entity store (static relationships like "owns", "supervises").
- **Stack nodes** (aka group nodes): created in `parse_records.ts` when multiple connectors share the same source-target pair. Color: `subdued`. Note: stacking refers to the grouping of connectors, while entity/label nodes handle their own internal grouping (entity count, event/alert counts) independently.
- **Connector nodes** = label nodes + relationship nodes (both connect entity nodes).

## Limits

- **Backend**: up to 1000 events/alerts fetched per query.
- **Frontend**: up to 300 nodes rendered. `REACHED_NODES_LIMIT` message shown when exceeded.

## Architecture

- **API**: Versioned internal POST at `GRAPH_ROUTE_PATH` (v1). Requires `cloud-security-posture-read` privilege.
- **License**: Platinum+ (ESS/self-hosted), Complete tier (Serverless). Feature flag: `securitySolution:enableGraphVisualization`.
- **Backend flow**: `route.ts` (endpoint + license check) -> `v1.ts` (orchestrator) -> `fetch_graph.ts` (parallel `Promise.all`) -> `parse_records.ts` (dedup, grouping, node/edge creation).
- **Parallel fetch**: `fetch_events_graph.ts` (ES|QL with LOOKUP JOIN for entity enrichment) + `fetch_entity_relationships_graph.ts` (entity store queries via FORK + LOOKUP JOIN).
- **Frontend**: `GraphInvestigation` is the main reusable component using `@xyflow/react`. Node shapes in `components/node/`. Lazy-loaded in Security Solution flyout via `graph_visualization.tsx`. Uses `useFetchGraphData()` hook for API calls.
- **Graph -> Flyout communication**: one-way via `useExpandableFlyoutApi` — the graph appends serializable params to the URL so the flyout panel reads from there (no non-serializable callbacks in flyout state).
- **Flyout -> Graph communication**: reverse direction uses a lightweight Pub-Sub (`groupedItemClick$` RxJS Subject) that `GraphVisualization` subscribes to, keeping the graph package decoupled from plugin-specific imports.

## Key files

### Schema & types

- `packages/kbn-cloud-security-posture/common/schema/graph/v1.ts` - request/response schemas
- `packages/kbn-cloud-security-posture/common/types/graph/v1.ts` - derived TypeScript types

### Backend (`plugins/cloud_security_posture/server/routes/graph/`)

- `route.ts` - endpoint definition, license check
- `v1.ts` - orchestrator (getGraph -> fetchGraph -> parseRecords)
- `fetch_graph.ts` - parallel fetch coordinator
- `fetch_events_graph.ts` - ES|QL event/alert queries with entity enrichment
- `fetch_entity_relationships_graph.ts` - entity store relationship queries
- `parse_records.ts` - record to node/edge conversion, dedup, grouping logic
- `entity_type_constants.ts` - entity type -> icon/shape mapping (add new types here)

### Frontend (`packages/kbn-cloud-security-posture/graph/src/components/`)

- `graph_investigation/graph_investigation.tsx` - main reusable component
- `node/` - node type components (diamond, ellipse, hexagon, pentagon, rectangle, label, relationship)
- `graph_grouped_node_preview_panel/` - flyout panel for grouped node items

### Frontend usage (`plugins/security_solution/public/flyout/document_details/`)

- `left/components/graph_visualization.tsx` - lazy-loaded wrapper in Security flyout
- `shared/hooks/use_graph_preview.ts` - access control hook (checks license + feature flag + required fields)

### License gating

- `packages/features/src/product_features_keys.ts` - `ProductFeatureSecurityKey.graphVisualization`
- `plugins/security_solution_serverless/common/pli/pli_config.ts` - Complete tier only

All paths above are relative to `x-pack/solutions/security/`.

## Testing

### Jest unit tests

```sh
yarn test:jest x-pack/solutions/security/plugins/cloud_security_posture/server/routes/graph/<test_file>
```

Test files: `v1.test.ts`, `fetch_graph.test.ts`, `fetch_events_graph.test.ts`, `fetch_entity_relationships_graph.test.ts`, `parse_records.test.ts`

### FTR tests (API, UI, Serverless)

For running FTR tests, load the `ftr-testing` skill.

**API integration**: `x-pack/solutions/security/test/cloud_security_posture_api/routes/graph.ts`
Config: `x-pack/solutions/security/test/cloud_security_posture_api/config.ts`

**UI functional**: `x-pack/solutions/security/test/cloud_security_posture_functional/pages/`

- `alerts_flyout.ts`, `events_flyout.ts`, `entity_preview_flyout.ts`
  Config: `x-pack/solutions/security/test/cloud_security_posture_functional/config.ts`

**Serverless functional**: `x-pack/solutions/security/test/serverless/functional/test_suites/ftr/cloud_security_posture/`

- `graph_alerts_flyout.ts`, `graph_events_flyout.ts`
  Config: `x-pack/solutions/security/test/serverless/functional/configs/config.cloud_security_posture.complete.ts`

### Test fixtures (es_archives)

- `test/cloud_security_posture_functional/es_archives/entity_store{,_v2}/`
- `test/cloud_security_posture_functional/es_archives/logs_gcp_audit/`
- `test/cloud_security_posture_functional/es_archives/security_alerts_{ecs_only,modified}_mappings/`
- `test/serverless/functional/es_archives/`

### Storybook

```sh
yarn storybook cloud_security_posture_graph
```

## Conventions

- Entity type -> shape/icon mapping lives in `entity_type_constants.ts`; add new entries there for new entity types.
- Test IDs use `TEST_SUBJ_*` constants defined alongside components.
- Frontend styling: EUI components + Emotion (`@emotion/react`).
- Storybook stories co-located with components (`.stories.tsx`).
- Unit tests co-located with components (`.test.ts`, `.test.tsx`).
- ES|QL query tests should be mostly black-box (assert inputs/outputs). Asserting critical ES|QL clauses is acceptable, but avoid testing every implementation detail.

## Philosophy

- **Keep ES|QL query code lean**: minimize complexity in query construction; prefer straightforward, readable queries.
- **Graph UI must be reusable**: `@kbn/cloud-security-posture-graph` components should not be coupled with API domain or response details. The package should work with any conforming view model.
- **Co-locate code in our package**: keep as much logic as possible inside `@kbn/cloud-security-posture-graph` for clear ownership and to avoid depending on other teams for reviews.
- **`GraphInvestigation` is the orchestrator, not the owner**: do not tightly couple it with specific consumers like the flyout panel. Use decoupling patterns (Pub-Sub, URL-serializable params via `useExpandableFlyoutApi`) instead of direct dependencies.

## Further reading

Open only what you need:

- `references/integration-guide.md` — field mapping requirements, actor resolution logic, entity enrichment, examples, troubleshooting, and performance considerations.
