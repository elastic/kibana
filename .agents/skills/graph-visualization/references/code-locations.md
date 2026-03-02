# Code Locations

All paths are relative to `x-pack/solutions/security/`.

## Schema & types

- `packages/kbn-cloud-security-posture/common/schema/graph/v1.ts` - request/response schemas
- `packages/kbn-cloud-security-posture/common/types/graph/v1.ts` - derived TypeScript types

## Backend (`plugins/cloud_security_posture/server/routes/graph/`)

- `route.ts` - endpoint definition, license check
- `v1.ts` - orchestrator (getGraph -> fetchGraph -> parseRecords)
- `fetch_graph.ts` - parallel fetch coordinator
- `fetch_events_graph.ts` - ES|QL event/alert queries with entity enrichment
- `fetch_entity_relationships_graph.ts` - entity store relationship queries
- `parse_records.ts` - record to node/edge conversion, dedup, grouping logic
- `entity_type_constants.ts` - entity type -> icon/shape mapping (add new types here)

## Frontend (`packages/kbn-cloud-security-posture/graph/src/components/`)

- `graph_investigation/graph_investigation.tsx` - main reusable component
- `node/` - node type components (diamond, ellipse, hexagon, pentagon, rectangle, label, relationship)
- `graph_grouped_node_preview_panel/` - flyout panel for grouped node items

## Frontend usage (`plugins/security_solution/public/flyout/document_details/`)

- `left/components/graph_visualization.tsx` - lazy-loaded wrapper in Security flyout
- `shared/hooks/use_graph_preview.ts` - access control hook (checks license + feature flag + required fields)

## License gating

- `packages/features/src/product_features_keys.ts` - `ProductFeatureSecurityKey.graphVisualization`
- `plugins/security_solution_serverless/common/pli/pli_config.ts` - Complete tier only

## Conventions

- Entity type -> shape/icon mapping lives in `entity_type_constants.ts`; add new entries there for new entity types.
- Frontend styling: EUI components + Emotion (`@emotion/react`).
