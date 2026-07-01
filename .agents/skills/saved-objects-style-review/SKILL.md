---
name: saved-objects-style-review
description: Kibana Saved Objects registration and style review guidance. Use when creating, changing, or reviewing Saved Object changes involving savedObjects.registerType, mappings, modelVersions, root mappings, or Saved Objects type definitions.
---

# Saved Objects Style Review

Use this skill when reviewing or changing Saved Object type registrations, especially code that calls `savedObjects.registerType`, edits `mappings`, or changes `modelVersions`.

## Mapping Mindset

Saved Object mappings are search indexes, not a complete schema. Add mappings only for fields that Kibana must search, filter, sort, or aggregate on. Stored attributes do not need mappings just because they exist in the Saved Object payload.

Default to `dynamic: false` for object mappings so Elasticsearch stores unmapped attributes without indexing them. Do not use `enabled: false` or `index: false`; those choices are hard to change later.

## Review Checklist

- If a new field is not queried, filtered, sorted, or aggregated, do not add a mapping, `mappings_addition`, or root mapping entry for it.
- If a new field is indexed, add it in both places: the latest type `mappings` and a `modelVersions` `mappings_addition`.
- Do not add a `mappings_addition` for a field that already existed in the type's root mappings before the change. Root mappings represent the latest complete mapping state; model version changes describe only what changed in that version.
- When adding an indexed field with a default value, pair `mappings_addition` with `data_backfill`. For a non-indexed field with a default, use only `data_backfill`.
- For new searchable behavior, prefer a two-release rollout: first add/backfill the indexed field, then depend on it in business logic in the next release.
- Keep `create` and `forwardCompatibility` schemas aligned with stored attributes. These schemas may include non-indexed fields even when mappings do not.

## Common Review Findings

Reject mapping churn that only mirrors TypeScript or runtime schemas. This increases Saved Object migration risk without making the data more searchable.

Check whether the proposed mapping already existed in the latest root mappings before this change. Re-declaring an existing root-mapped field as newly added is noisy and can make migration history misleading.

For early, unreleased Saved Object types with unstable mappings, prefer the documented WIP Saved Object type workflow instead of weakening migration checks or repeatedly reshaping committed mapping history.

## References

- `docs/extend/key-concepts/saved-objects/create.md`
- `docs/extend/key-concepts/saved-objects/update.md`
- `packages/kbn-check-saved-objects-cli/README.md`
