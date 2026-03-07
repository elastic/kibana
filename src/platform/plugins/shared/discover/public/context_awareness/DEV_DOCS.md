# Discover Context Awareness - Developer Docs

This document is for maintainers of the framework itself (not profile consumers).
It describes the runtime model, invariants, and safe ways to evolve the system.

## Scope and Non-Goals

- Scope: internals in `context_awareness/` and the runtime wiring that executes them.
- Non-goal: extension-point usage guidance for product teams. See `README.md` and `EXTENSION_POINTS_INVENTORY.md` for that.

## Runtime Topology

### Core primitives

- `Profile` contract: `types.ts`.
- Composable merge primitive: `composable_profile.ts` (`getMergedAccessor`).
- Provider matching engine: `profile_service.ts` (`ProfileService`/`AsyncProfileService`).
- Context-level contracts: `profiles/root_profile.ts`, `profiles/data_source_profile.ts`, `profiles/document_profile.ts`.
- Orchestration: `profiles_manager/profiles_manager.ts` and `profiles_manager/scoped_profiles_manager.ts`.

### Runtime wiring

- Services and manager are instantiated in `plugin.tsx`.
- Providers are registered in `register_profile_providers.ts` via `registerEnabledProfileProviders`.
- A `ScopedProfilesManager` is created per tab/panel in `application/main/state_management/redux/runtime_state.tsx`.

## Resolution Model

### Context levels

- Root: async, one context for the Discover app/session panel.
- Data source: async, one context per tab.
- Document: sync, one context per record.

### Matching semantics

- First match wins per level.
- Order is registration order (`register_profile_providers.ts`).
- Exactly one resolved profile per level at a time.
- If no provider matches, service `defaultContext` is used.

### Provider enablement gates

`registerEnabledProfileProviders` applies two filters before registration:

- Experimental gate: `isExperimental` requires profile ID in `discover.experimental.enabledProfiles`.
- Product-feature gate: `restrictedToProductFeature` must be available from pricing service.

## Composition Model

`getMergedAccessor` merges profiles in fixed order:

1. Root
2. Data source
3. Document

Each accessor receives `prev` and can either:

- Compose: call `prev(...)` and extend result.
- Override: do not call `prev(...)`, replacing earlier behavior.

Important: this is a simple left-to-right reduction over the resolved profile list; there is no priority system besides order.

## Applied Profile Binding

`BaseProfileService.getProfile` returns a `Proxy` that lazily binds:

- `params.context` (resolved context with injected `profileId`)
- `params.toolkit` (host actions: open tab, update ES|QL, add filter, etc.)

That means provider accessor functions are not executed at profile retrieval time; they execute only when Discover invokes the accessor.

## Caching, Dedup, and Cancellation

### Root level (`ProfilesManager`)

- Dedup key is serialized from `solutionNavId` only.
- Repeated calls with same serialized params return current root accessors without re-resolving.
- New resolution aborts prior in-flight resolution with `AbortReason.REPLACED`.

### Data source level (`ScopedProfilesManager`)

- Dedup key is serialized from:
  - `dataViewId` for data-view mode
  - `esqlQuery` for ES|QL mode
- New resolution aborts prior in-flight resolution with `AbortReason.REPLACED`.

### Document level

- No async cancellation path (sync service by design).
- Context is resolved lazily through a record `Proxy` when `record.context` is first read.
- Resolved context is memoized per proxied record instance.

## Failure Behavior and Fallback

- Root/data source resolve errors are caught, logged, and fallback to service defaults.
- Document resolve errors are caught when `context` is accessed; fallback to default document context.
- Error logging uses `logResolutionError` with params snapshot and context level.

Default contexts live in service constructors:

- `default-root-profile`
- `default-data-source-profile`
- `default-document-profile`

## Where Resolution Happens in App Flow

- Root resolution: `use_root_profile.tsx` listens to active solution nav ID and calls `profilesManager.resolveRootProfile(...)`.
- Data source resolution: `discover_data_state_container.ts` calls `scopedProfilesManager.resolveDataSourceProfile(...)` before fetch.
- Document resolution: data fetchers call `scopedProfilesManager.resolveDocumentProfile({ record })`:
  - `fetch_documents.ts`
  - `fetch_esql.ts`

## Where Accessors Are Consumed

- Generic merge hook: `hooks/use_profile_accessor.ts`.
- Representative consumers:
  - Grid cell renderers in `application/main/components/layout/discover_documents.tsx`
  - Histogram vis customization in `application/main/components/chart/use_discover_histogram.ts`
  - Top-nav app menu extension in `application/main/components/top_nav/use_top_nav_links.tsx`
  - Default app state merge in `application/main/state_management/utils/get_default_profile_state.ts`

## EBT and Observability Hooks

- Root/data-source resolution changes emit profile-resolved events and update profile context in scoped EBT manager.
- Document profile events are emitted when a record context is accessed.

When debugging profile selection, verify both:

- Framework logs (`[ProfilesManager] ... context resolution failed ...`)
- EBT contextual profile events for expected profile IDs.

## Evolution Guidelines

### Adding a new extension point

1. Add API surface in `types.ts` (`Profile` + params/result types).
2. Add Discover call site with explicit base implementation.
3. Retrieve merged accessor via `useProfileAccessor(...)` or `getMergedAccessor(...)`.
4. Add/adjust tests around merge order and base fallback.
5. Update `README.md` and `EXTENSION_POINTS_INVENTORY.md`.

### Adding/changing context-level behavior

1. Preserve first-match-wins semantics unless intentionally redesigning all services.
2. Revisit serialization keys in managers when changing what should trigger re-resolution.
3. Keep document-level resolution synchronous unless you redesign row rendering and data-fetch contracts.
4. Ensure fallback defaults remain valid and non-throwing.

### Using `extendProfileProvider`

- `extendProfileProvider` shallow-merges provider fields and profile accessors.
- Overlapping accessor keys in extension replace the base accessor key.
- Keep this in mind when composing sub-profiles to avoid accidental override of base behavior.

## Testing Guidance

High-signal tests for this framework:

- `composable_profile.test.ts` for merge ordering and override behavior.
- `profile_service.test.ts` for first-match semantics and default fallback.
- `profiles_manager/profiles_manager.test.ts` for dedup, cancellation, error fallback, and observable updates.

Before finalizing changes, run:

- `node scripts/check_changes.ts`
- Targeted Jest tests under `src/platform/plugins/shared/discover/public/context_awareness/`
