---
title: Discover Shared Guide for Agents
---

# Discover Shared (discoverShared)

This plugin is a **stateful IoC bridge** used to register shared features that Discover can consume **without creating direct plugin dependencies**. Use it sparingly.

## When to use
- You cannot directly import a solution plugin without creating dependency cycles.
- The feature is owned by another solution team and cannot be moved into Discover.
- You have a plan to migrate the feature into a dedicated package later.

## Architecture
- Browser-only plugin (no server code).
- Core concept: a **typed registry** of `DiscoverFeature` entries.
- The same registry instance is exposed on setup and start.

Key files:
- `public/plugin.ts`
- `public/services/discover_features/discover_features_service.ts`
- `public/services/discover_features/types.ts`
- `common/features_registry/features_registry.ts`

## Adding a feature
1. Define a feature interface in `public/services/discover_features/types.ts`.
2. Add it to the `DiscoverFeature` union.
3. Register the feature from the owning plugin via `discoverShared.features.registry.register(...)`.
4. Consume the feature in Discover via `getById(featureId)` and render it conditionally.

## Constraints
- Feature IDs must be unique (duplicate registration throws).
- Do not use this as a general customization mechanism.
- Keep contracts minimal and explicit to preserve type safety.

## Testing
- Unit tests live in `common/features_registry/features_registry.test.tsx`.
- Use `public/mocks.ts` and `public/services/discover_features/discover_features_service.mock.ts` for test setup.
- Example: `yarn test:jest src/platform/plugins/shared/discover_shared`
- If a verifier sub-agent exists (e.g., `kibana-verifier` or `verifier`), run it and include its findings in the test notes.

## Escalation
If a change requires new feature contracts or impacts consuming plugins, coordinate with the owning teams before finalizing.

## References
- `src/platform/plugins/shared/discover_shared/README.md`
- `src/platform/plugins/shared/discover/public/context_awareness/README.md`
