---
name: graph-visualization
description: Use when working on the Graph Visualization feature in Security Solution - entity/label/relationship nodes, graph API, @xyflow components, ES|QL queries, entity store, or license gating.
---

# Graph Visualization

Security event visualization using an Actor-Action-Target model. Entities (users, hosts, services, etc.) are nodes connected by label nodes (events/alerts) and relationship nodes (entity store relationships). Accessible in Security flyouts (Hosts, Users, Network events + Alerts) when events contain the required actor, action, and target fields.

## Domain model

Events follow an **Actor-Action-Target** model:

- **Actor**: the entity that performs the action. Resolved by priority (user > host > service > generic). Only one actor per event.
- **Action**: the operation performed (e.g. "ConsoleLogin", "AssumeRole").
- **Targets**: all target entity fields are included (no priority, multiple supported). Each target becomes a separate node.

See `references/field-mappings.md` for exact field names, resolution rules, and rendering requirements.

## Node types

- **Entity nodes**: 5 shapes mapped by entity type (ellipse=user, hexagon=cloud resource, rectangle=host/container, diamond=network, pentagon=other). Grouped entities show an entities count.
- **Label nodes**: connectors between entities representing events/alerts. Color: `danger`=alerts, `primary`=events. Grouped events show events count and alerts count. Support stacked display when count > 2.
- **Relationship nodes**: connectors from entity store (static relationships like "owns", "supervises").
- **Stack nodes** (aka group nodes): created when multiple connectors share the same source-target pair. Color: `subdued`. Stacking groups connectors; entity/label nodes handle their own internal grouping independently.
- **Connector nodes** = label nodes + relationship nodes (both connect entity nodes).

## Limits

- **Backend**: up to 1000 events/alerts fetched per query.
- **Frontend**: up to 300 nodes rendered. `REACHED_NODES_LIMIT` message shown when exceeded.

## Architecture

- **API**: Versioned internal POST (v1). Requires `cloud-security-posture-read` privilege.
- **License**: Platinum+ (ESS/self-hosted), Complete tier (Serverless). Feature flag: `securitySolution:enableGraphVisualization`.
- **Backend flow**: endpoint with license check -> orchestrator -> parallel fetch (events via ES|QL + entity relationships via entity store) -> parse, deduplicate, and group into nodes/edges.
- **Frontend**: `GraphInvestigation` is the main reusable component using `@xyflow/react`. Lazy-loaded in Security Solution flyout. Uses `useFetchGraphData()` hook for API calls.
- **Client-side gating**: the reusable `useGraphPreview` hook determines whether the graph should render (checks license, feature flag, and required fields in the event).
- **Graph -> Flyout**: one-way via `useExpandableFlyoutApi` — serializable params appended to the URL so the flyout panel reads from there.
- **Flyout -> Graph**: reverse via lightweight Pub-Sub (`groupedItemClick$` RxJS Subject), keeping the graph package decoupled from plugin-specific imports.

## Philosophy

- **Keep ES|QL query code lean**: minimize complexity in query construction; prefer straightforward, readable queries.
- **Graph UI must be reusable**: `@kbn/cloud-security-posture-graph` components should not be coupled with API domain or response details. The package should work with any conforming view model.
- **Co-locate code in our package**: keep as much logic as possible inside `@kbn/cloud-security-posture-graph` for clear ownership and to avoid depending on other teams for reviews.
- **`GraphInvestigation` is the orchestrator, not the owner**: do not tightly couple it with specific consumers like the flyout panel. Use decoupling patterns (Pub-Sub, URL-serializable params via `useExpandableFlyoutApi`) instead of direct dependencies.

## Further reading

Open only what you need:

- `references/code-locations.md` — file paths grouped by area (schema, backend, frontend, license gating) and code conventions.
- `references/testing.md` — how to run Jest, FTR, and Storybook tests; test file locations, fixtures, and testing conventions.
- `references/field-mappings.md` — required fields, actor resolution logic, target population rules, entity enrichment, and ECS references.
- `references/examples.md` — real-world cloud audit log examples and edge cases.
- `references/troubleshooting.md` — common issues, verification checklist, performance tips, and getting help.
