# EUID (Entity Unique ID) Algorithm

> Quick reference for how `entity.id` is constructed per entity type. Useful for QA testing, debugging "why did this flyout open?", and understanding entity identity.

## Overview

EUID is a deterministic string constructed from entity fields. The algorithm tries field compositions in priority order — the **first composition where ALL fields are non-empty** wins.

Format: `{type}:{field1}@{field2}@...`

## User Entities

Users have **two branches** based on `entity.namespace`:

### High Confidence (HC) — IDP entities (`entity.namespace != 'local'`)

| Priority | EUID Format | Example |
|----------|-------------|---------|
| 1 | `user:{user.email}@{entity.namespace}` | `user:emily@acme.com@okta` |
| 2 | `user:{user.id}@{entity.namespace}` | `user:00u1abvz4p@okta` |
| 3 | `user:{user.name}@{user.domain}@{entity.namespace}` | `user:jdoe@CORP@active_directory` |
| 4 | `user:{user.name}@{entity.namespace}` | `user:admin@entra_id` |

- **Source:** Identity Provider integrations (Okta, AD, Entra ID, Google Workspace)
- **`entity.confidence`:** `high`
- **Creation gate:** `event.kind: asset` OR (`event.category: iam` AND `event.type` in [user, creation, deletion, group])

### Medium Confidence (MC) — local/endpoint entities (`entity.namespace == 'local'`)

| Priority | EUID Format | Example |
|----------|-------------|---------|
| 1 (only) | `user:{user.name}@{host.id}@local` | `user:jdoe@laptop-A@local` |

- **Source:** Endpoint agents (Elastic Defend, CrowdStrike, SentinelOne)
- **`entity.confidence`:** `medium`
- **`entity.name`:** `{user.name}@{host.name}` (display name, not EUID)
- **Creation gate:** `user.name` + `host.id` present, user not a service account, `event.outcome != failure`
- **Excluded service accounts:** root, bin, daemon, sys, nobody, jenkins, ansible, deploy, terraform, gitlab-runner, postgres, mysql, redis, elasticsearch, kafka, admin, operator, service

## Host Entities

Linear ranking, no branches:

| Priority | EUID Format | Example |
|----------|-------------|---------|
| 1 | `host:{host.id}` | `host:550e8400-e29b-41d4-a716-446655440000` |
| 2 | `host:{host.name}` | `host:web-prod-01` |
| 3 | `host:{host.hostname}` | `host:web-prod-01.corp.acme.com` |

## Service Entities

Single field, no ranking:

| Priority | EUID Format | Example |
|----------|-------------|---------|
| 1 (only) | `service:{service.name}` | `service:payment-api` |

## entity.namespace Computation

`entity.namespace` is computed from `event.module` / `data_stream.dataset` via a mapping table:

| Integration module/dataset | Namespace |
|---------------------------|-----------|
| `okta`, `entityanalytics_okta` | `okta` |
| `azure`, `entityanalytics_entra_id` | `entra_id` |
| `o365`, `o365_metrics` | `microsoft_365` |
| `entityanalytics_ad` | `active_directory` |
| `google_workspace` | `google_workspace` |
| (no match) | `unknown` |

Full mapping: `user.ts` → `entityNamespaceMapping` in `whenConditionTrueSetFieldsPreAgg`.

## Key Implementation Details

- **Branch selection**: `entity.namespace == 'local'` → MC ranking; otherwise → HC ranking
- **First-match wins**: A composition only matches if ALL its fields are present and non-empty
- **Document `_id`**: MD5 hash of the EUID string (not the EUID itself)
- **EUID is immutable**: Once computed, it's the entity's permanent identity
- **Resolution uses EUID**: `resolved_to` stores the target entity's EUID string

## Common QA Scenarios

| Scenario | Why it happens |
|----------|---------------|
| "Why did clicking this user open a different user's flyout?" | Entity is an alias (`resolved_to` set). Flyout navigates to the golden/target entity. |
| "Why are there two entities for the same person?" | Same person, different IDP accounts (e.g., `user:emily@okta` vs `user:emily@entra_id`). Expected — resolution links them. |
| "Why is this user entity showing `user:jdoe@laptop-A@local`?" | MC entity from endpoint data. `entity.namespace == 'local'`, uses `user.name@host.id@local` format. |
| "Why does this entity have no email in its EUID?" | `user.email` was empty for that source event. Algorithm fell through to priority 2+ (user.id or user.name). |
| "Why did this entity not get created at all?" | Failed pipeline gates: either `documentsFilter` (pre-agg) or `postAggFilter` (post-agg) excluded the source events. |

## Code Locations

| File | Purpose |
|------|---------|
| `common/domain/definitions/user.ts` | User entity: HC/MC branches, confidence, namespace mapping |
| `common/domain/definitions/host.ts` | Host entity: 3-field linear ranking |
| `common/domain/definitions/service.ts` | Service entity: single-field identity |
| `common/domain/euid/memory.ts` | In-memory EUID calculation (`getEuidFromObject`) |
| `common/domain/euid/commons.ts` | Field ranking logic (`getEffectiveEuidRanking`) |
| `common/domain/euid/esql.ts` | ESQL generation for extraction pipelines |
| `common/domain/euid/field_evaluations.ts` | Field evaluation application |

All paths relative to `x-pack/solutions/security/plugins/entity_store/`.
