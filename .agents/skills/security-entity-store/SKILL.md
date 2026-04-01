---
name: security-entity-store
description: >
  Security Solution Entity Store architecture and implementation guide.
  Use when working with Security Entity Store code, entity analytics, entity resolution,
  golden entity, alias entity, resolved_to, resolution fields, entity maintainers,
  EUID, entity CRUD API, or related features in the Security Solution.
  Also use when someone asks "how does entity store work", "entity store v2",
  "entity maintainer", or mentions the entity_store plugin under
  x-pack/solutions/security/plugins/entity_store/.
  NOTE: This is the Security Solution Entity Store, not Observability's entity model.
---

# Security Solution Entity Store

Entity Store is part of Kibana **Security Solution's** Entity Analytics. It aggregates entity-centric security data from multiple sources into a single shared index. It lives in `x-pack/solutions/security/plugins/entity_store/`.

> This skill covers the **Security Solution** Entity Store (`entityStore` plugin). It is not related to Observability's entity model or SLO entities.

**Two versions exist:**
- **v2 (ESQL + Kibana Task)** — active architecture, default since 9.4.0. All new features (Entity Resolution, CRUD API, Maintainers) are v2-only.
- **v1 (Transforms + Enrich Policies)** — legacy, pre-9.4.0. See [references/v1-legacy.md](references/v1-legacy.md) only when debugging older deployments or support tickets.

## v2 Architecture (Active — 9.4.0+)

- **Kibana Task** runs ESQL queries with timestamp-based pagination (~10s batches)
- **Upsert with conflict retry** — never overwrites entire documents
- **LOOKUP JOIN + COALESCE** for field retention — preserves API-set fields across extraction runs
- **EUID** — deterministic entity ID via `euid.getEuidFromObject('host', doc)` (from `@kbn/entity-store-plugin`). Also ES stored scripts.
- **Single shared index** — `.entities.v2.latest.security_{namespace}`, all entity types, scoped by `entity.EngineMetadata.Type`
- **Auto-enabled** — installs on Security Solution navigation. `entityStore` is a required plugin dependency of `securitySolution`.

## Entity Types

**Host** (`host.name`), **User** (`user.name`), **Service**, **Generic** (dynamic, Asset Inventory).

User entities use namespace-qualified `entity.id` (`user:id@namespace`). `entity.namespace` from `event.module`. Non-IDP entities have `namespace: 'local'`, confidence `medium`.

## Plugin Location

```
x-pack/solutions/security/plugins/entity_store/
├── common/domain/definitions/        # Entity schemas, field definitions
├── server/
│   ├── plugin.ts                     # Setup + start contracts
│   ├── domain/
│   │   ├── asset_manager/            # Engine lifecycle (directory)
│   │   ├── resolution/               # Resolution: link/unlink/group
│   │   ├── crud_client/              # CRUD: create/update/bulk/delete
│   │   ├── errors/                   # 12 error classes (see references/errors.md)
│   │   └── logs_extraction/          # ESQL query builders
│   ├── routes/apis/                  # Route handlers
│   └── tasks/
│       ├── extract_entity_task.ts    # ESQL extraction (~10s)
│       └── entity_maintainers/       # Maintainers framework (plural)
```

## References (read as needed)

- **[references/api-routes.md](references/api-routes.md)** — Complete route table with curl examples
- **[references/euid.md](references/euid.md)** — EUID algorithm: how entity.id is constructed per entity type, HC/MC branches, namespace mapping, QA scenarios
- **[references/errors.md](references/errors.md)** — All 12 error classes with conditions
- **[references/maintainers.md](references/maintainers.md)** — Maintainers framework: registration, context, lifecycle
- **[references/resolution.md](references/resolution.md)** — Entity Resolution: architecture, ResolutionClient, ESQL patterns
- **[references/contracts.md](references/contracts.md)** — Plugin contracts and request handler context
- **[references/v1-legacy.md](references/v1-legacy.md)** — v1 architecture (transforms, enrich, painless), index naming, API routes, migration path. **Only read when debugging pre-9.4 deployments or support tickets.**

## Gotchas

- **Route paths use underscores** — `entity_maintainers` not `entity-maintainers`. All routes follow this pattern.
- **Unlink skips non-aliases silently** — `UnlinkResult` has a `skipped: string[]` field for entities without `resolved_to`. No error thrown.
- **`?force=true` required** for CRUD updates to fields without `allowAPIUpdate: true`. Resolution fields have it set, so no force needed for resolution operations.
- **`entity.source` is an array** (since PR #259813). Previously was a single string. UI must handle arrays.
- **Document `_id` = MD5 hash of EUID** — not the EUID itself.
- **v1 endpoints being removed** — PR #260415 removes v1 routes. For v1 details, see [references/v1-legacy.md](references/v1-legacy.md).
- **EUID stored scripts must be registered** before entity store init — they're deployed during install.
- **CCS indices excluded** from extraction queries — cross-cluster data handled by separate `ccsLogsExtractionClient`.
- **ES bulk `update` with partial `doc` does NOT run `default_pipeline`** — known upstream bug ([elastic/elasticsearch#105804](https://github.com/elastic/elasticsearch/issues/105804), fix targeted for ES v9.4.0). The latest index has a `dot_expander` pipeline, but it's bypassed by partial updates. Always use `unflattenObject` from `@kbn/object-utils` when writing partial docs with dotted keys (see `bulkUpdateEntityDocs` in `infra/elasticsearch/resolution.ts`).

## Licensing

- **Entity Store** (v2) — all license tiers
- **Entity Graph** — Platinum+
- **Entity Analytics** — Platinum+
- **Advanced Entity Analytics** (includes Entity Resolution) — Enterprise (ESS) + Complete (Serverless)

## Feature Gating

v2 features gated behind `securitySolution:entityStoreEnableV2` advanced UI setting.
- Frontend: `useUiSetting$<boolean>('securitySolution:entityStoreEnableV2')`
- Constant: `FF_ENABLE_ENTITY_STORE_V2` from `@kbn/entity-store/public`
