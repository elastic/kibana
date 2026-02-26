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
- **Client-side gating**: the reusable `useGraphPreview` hook determines whether the graph should render (checks license, feature flag, and required fields in the event).
- **Graph -> Flyout communication**: one-way via `useExpandableFlyoutApi` — the graph appends serializable params to the URL so the flyout panel reads from there (no non-serializable callbacks in flyout state).
- **Flyout -> Graph communication**: reverse direction uses a lightweight Pub-Sub (`groupedItemClick$` RxJS Subject) that `GraphVisualization` subscribes to, keeping the graph package decoupled from plugin-specific imports.

## Conventions

- Entity type -> shape/icon mapping lives in `entity_type_constants.ts`; add new entries there for new entity types.
- Frontend styling: EUI components + Emotion (`@emotion/react`).

## Philosophy

- **Keep ES|QL query code lean**: minimize complexity in query construction; prefer straightforward, readable queries.
- **Graph UI must be reusable**: `@kbn/cloud-security-posture-graph` components should not be coupled with API domain or response details. The package should work with any conforming view model.
- **Co-locate code in our package**: keep as much logic as possible inside `@kbn/cloud-security-posture-graph` for clear ownership and to avoid depending on other teams for reviews.
- **`GraphInvestigation` is the orchestrator, not the owner**: do not tightly couple it with specific consumers like the flyout panel. Use decoupling patterns (Pub-Sub, URL-serializable params via `useExpandableFlyoutApi`) instead of direct dependencies.

## Further reading

Open only what you need:

- `references/code-locations.md` — file paths grouped by area (schema, backend, frontend, license gating).
- `references/testing.md` — how to run Jest, FTR, and Storybook tests; test file locations, fixtures, and testing conventions.
- `references/field-mappings.md` — required fields, actor resolution logic, target population rules, entity enrichment, and ECS references.
- `references/examples.md` — real-world cloud audit log examples and edge cases.
- `references/troubleshooting.md` — common issues, verification checklist, performance tips, and getting help.
