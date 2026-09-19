---
name: kibana-privilege-deprecation
description: Implement and review Kibana feature privilege deprecations and live-feature privilege extractions. Use when deprecating features, renaming features, splitting features, consolidating features, moving privilege capabilities, extracting a grant out of a live feature's `all`/`read` privilege into a sub-feature without deprecating it, reviewing deprecation PRs, or working with the `replacedBy`/`privilegeVersions` mapping systems.
---

# Kibana Privilege Deprecation

Guides implementing and reviewing backward-compatible Kibana feature privilege deprecations and live-feature privilege-version extractions.

## Which mechanism do I need?

Three mechanisms solve overlapping-looking but distinct problems. Picking the wrong one is the most common mistake — check this first.

| Situation | Mechanism |
|---|---|
| The feature itself is being renamed, split, merged, or otherwise conceptually replaced by a *different* feature (possibly more than one) | Whole-feature deprecation + `replacedBy` (this skill's main subject, below) |
| A grant that today ships unconditionally inside a *live* feature's `all`/`read` privilege needs to become independently toggle-able, but the feature id and everything else about it stays the same | **`privilegeVersions`** (below) — extracts the grant into a sub-feature while keeping `minimal_all`/`minimal_read` working for every already-stored role, no role save required |
| You just need to ADD a brand-new capability that not everyone with `all` should get, and you're fine with `all` users never being able to opt out of it | `includeIn: 'none'` sub-feature + a second, OR'd `requiredPrivileges` check in the route/UI. Cheapest option, but additive-only — can't be used to let `all` users *opt out* of something they already have |

Don't reach for a whole-feature id bump (deprecate `foo`, create `foo_v2`) just to split a grant off of `all` — that's the `privilegeVersions` case, and doing it via `replacedBy` instead means the feature id churns forever (see Cases' `cases_v2`, `cases_v3`...). `privilegeVersions` keeps the id, keeps the feature live and visible, and only versions the specific `minimal_all`/`minimal_read` names.

## When to Use

- Renaming a feature (e.g. `alpha` -> `beta`)
- Splitting a feature into multiple features
- Consolidating multiple features into one
- Moving capabilities between feature/sub-feature privileges
- Extracting a grant out of a *live* feature's `all`/`read` privilege into a sub-feature, without deprecating the feature (see `privilegeVersions` below)
- Reviewing PRs that deprecate features, change privilege mappings, or add `privilegeVersions`

## Key Concepts

- **Deprecated feature**: A feature marked with `deprecated` property that is frozen for backward compatibility. Not shown in role management UI; privileges still registered in Elasticsearch.
- **`replacedBy` mapping**: Links each deprecated privilege to equivalent non-deprecated privilege(s). Required on every privilege of a deprecated feature.
- **`privilegeVersions`**: The live-feature counterpart to `replacedBy` — versions a top-level privilege's `minimal_<id>` name in place, on a feature that stays live and keeps its id. See its own section below.
- **Lazy migration**: Roles are not auto-migrated. Deprecated/legacy privileges are replaced with current ones when an admin saves via UI (or, for `privilegeVersions`, whenever a role is fetched with `replaceDeprecatedPrivileges: true`, which the Role Management UI and Spaces UI already always pass).
- **`kibana_system` cannot alter roles** - this is a security constraint driving the entire design.

## Implementation Steps

### Step 1: Create new replacement feature(s)

Register new feature(s) with desired privileges using `deps.features.registerKibanaFeature()`.

### Step 2: Mark existing feature as deprecated

Add `deprecated` property with a user-facing `notice` string. Feature ID must stay unchanged.

```ts
deps.features.registerKibanaFeature({
  deprecated: {
    notice: i18n.translate('xpack.yourPlugin.featureDeprecationNotice', {
      defaultMessage: 'Feature X is deprecated. Use Feature Y instead. See {link}.',
      values: { link: 'https://...' },
    }),
    // Optional: override which features conceptually replace this one (for Spaces UI).
    // By default derived from privilege-level replacedBy. Only needed when replacedBy
    // references multiple features but you want the Spaces UI to show a subset.
    replacedBy: ['feature_y'],
  },
  id: 'feature_x',  // Must stay the same
  name: 'Feature X (DEPRECATED)',
  privileges: { /* keep original privileges unchanged, add replacedBy */ },
});
```

### Step 3: Define `replacedBy` on every privilege

Every `all`, `read`, and sub-feature privilege must have `replacedBy`.

**Simple form** -- use when the deprecated feature has NO sub-features:

```ts
privileges: {
  all: {
    ...originalAllPrivilege,
    replacedBy: [
      { feature: 'feature_y', privileges: ['all'] },
    ],
  },
  read: {
    ...originalReadPrivilege,
    replacedBy: [
      { feature: 'feature_y', privileges: ['read'] },
    ],
  },
}
```

**Extended `{ default, minimal }` form** -- use when the deprecated feature HAS sub-features:

When a deprecated feature has sub-features, the top-level `all` privilege implicitly includes all sub-feature privileges granted via `includeIn: 'all'`, while `minimal_all` does not. These two paths must map differently to preserve the distinction. The same applies to `read` / `minimal_read`.

```ts
privileges: {
  all: {
    ...originalAllPrivilege,
    replacedBy: {
      // `default` maps `all` (= minimal_all + auto-granted sub-feature privileges)
      default: [
        { feature: 'feature_y', privileges: ['all', 'sub_feature_priv_id'] },
      ],
      // `minimal` maps `minimal_all` (= top-level only, no sub-features)
      minimal: [
        { feature: 'feature_y', privileges: ['minimal_all'] },
      ],
    },
  },
  read: {
    ...originalReadPrivilege,
    replacedBy: {
      default: [
        { feature: 'feature_y', privileges: ['read', 'sub_feature_priv_id'] },
      ],
      minimal: [
        { feature: 'feature_y', privileges: ['minimal_read'] },
      ],
    },
  },
}
// Each sub-feature privilege also needs its own replacedBy (simple array form):
// replacedBy: [{ feature: 'feature_y', privileges: ['sub_feature_priv_id'] }]
```

**Rule of thumb**: If the deprecated feature defines `subFeatures`, always use the `{ default, minimal }` form on its top-level privileges. The simple array form is only correct when there are no sub-features (it applies the same mapping to both default and minimal).

### Step 4: Update code to use new features

- **API privileges**: Replacement privileges must provide all API privileges from deprecated privileges. Routes use `security.authz.requiredPrivileges` for authorization. Ensure deprecated feature's `api` array is updated so that both deprecated and replacement privilege holders can access the same endpoints.
- **UI capabilities**: Update client code to check `capabilities.new_feature.capability` instead of `capabilities.old_feature.capability`. The framework auto-maps deprecated capabilities to replacement ones.
- **Alerting consumers**: New features must register deprecated feature ID as additional consumer so rules created under old feature remain accessible.
- **Cases owners**: Follow same pattern as alerting for case ownership continuity.

## Extracting a grant from a live feature's `minimal_all`/`minimal_read` (`privilegeVersions`)

Use this instead of Steps 1-4 above when the feature must stay live, under the same id, not deprecated.

### The problem this solves

`all` can grow for free: adding a new `includeIn: 'all'` sub-feature privilege automatically widens `all` on the next Kibana restart, because `all`'s actions are recomputed from the current feature config every time. But `all` (and `read`) cannot *shrink* the same way — and neither can their implicit minimal counterparts, `minimal_all`/`minimal_read`. If a grant that's hard-coded into a privilege's own `api`/`ui`/`savedObject`/etc. fields needs to become independently toggle-able, moving it into a sub-feature shrinks `minimal_all`'s *registered actions* for every role that already stores `['minimal_all', ...]` — silently, on the next restart, with no role save involved. `privilegeVersions` freezes the old, larger `minimal_all` forever under its original name, and mints a new, smaller name for future customizations.

### Step 1: Move the grant into a sub-feature, as usual

Add a new sub-feature privilege with `includeIn: 'all'` (or `'read'`) for whichever top-level privilege the grant is being extracted from. Remove the grant from the top-level privilege's own fields.

### Step 2: Append one `privilegeVersions` entry

```ts
privileges: {
  all: {
    // ...own fields, now WITHOUT the extracted grant...
    privilegeVersions: [
      {
        version: 'v2', // first extraction is always 'v2'; next one (if any) is 'v3', etc.
        extractedInto: [{ feature: 'my_feature', privileges: ['can_manage_settings'] }],
      },
    ],
  },
},
subFeatures: [
  {
    name: 'Settings',
    privilegeGroups: [
      {
        groupType: 'independent',
        privileges: [
          { id: 'can_manage_settings', name: 'Can manage settings', includeIn: 'all', /* ... */ },
        ],
      },
    ],
  },
],
```

This mints `minimal_all` (frozen forever, still includes the grant), `minimal_all_v2` (current, live — excludes it), and registers both permanently in Elasticsearch. `all` needs no changes at all — it stays whole automatically. Never edit or remove an existing `privilegeVersions` entry once shipped; only append. A second extraction later just appends a `v3` entry — it does not require touching the `v2` entry, and does not break a role that was customized (and therefore saved with `minimal_all_v2`) between the two extractions.

### Rules

- `privilegeVersions` only goes on the top-level `all`/`read` privilege, never on a sub-feature privilege, and never on a `reserved` privilege.
- Mutually exclusive with `feature.deprecated`/`replacedBy` on the same feature — pick one mechanism per feature.
- `version` strings must be sequential starting at `'v2'` (no gaps, no reordering).
- `extractedInto` may only reference sub-feature privileges of the **same** feature (unlike `replacedBy`, which is explicitly cross-feature) — this mechanism is intentionally scoped to intra-feature extraction only.
- Each referenced sub-feature privilege's `includeIn` must exactly match the privilege being versioned (`'all'` for `all`'s versions, `'read'` for `read`'s) — this is what keeps the extraction from accidentally widening or shrinking something else.

### What you don't need to change

The read path (Role Management UI, Spaces UI) already normalizes legacy minimal ids to the current one for display/edit, gated behind the same `replaceDeprecatedPrivileges` flag the UI already always passes — no route or client change needed for the two built-in consumers. The write path (saving a role) always persists the current id from then on, automatically, once the feature declares `privilegeVersions` — `PrimaryFeaturePrivilege.getMinimalPrivilegeId()` resolves it.

## Validation Rules (Enforced at Startup)

Kibana will refuse to start if any of these are violated:

1. Deprecated features **must** define `replacedBy` on every privilege
2. Non-deprecated features **must not** define `replacedBy`
3. Referenced replacement features **must** exist and not be deprecated
4. Referenced replacement privileges **must** exist
5. Enabled privileges **cannot** be replaced with disabled ones
6. `feature.deprecated.replacedBy` feature IDs (if set) must be a subset of features used in privilege-level `replacedBy`
7. `privilegeVersions` **cannot** appear on a deprecated feature, a sub-feature privilege, or a reserved privilege
8. `privilegeVersions` entries **must** be sequentially versioned (`v2`, `v3`, ...), each with a non-empty `extractedInto`
9. `extractedInto` **must** reference an existing, enabled sub-feature privilege of the *same* feature, whose `includeIn` exactly matches the privilege being versioned
10. The same `extractedInto` target **cannot** appear more than once across one privilege's `privilegeVersions`

## PR Review Checklist

When reviewing deprecation PRs, focus on what startup validation does NOT catch:

- [ ] Deprecated feature ID is unchanged from original
- [ ] `deprecated.notice` is localized (`i18n.translate`) with a link to docs or PR
- [ ] If deprecated feature has sub-features: top-level `replacedBy` uses `{ default, minimal }` form, not simple array
- [ ] Replacement privileges cover all SO types, `api` entries, `ui` capabilities, `app`, `catalogue`, and `management` from the deprecated ones
- [ ] If replacement grants MORE access than deprecated, it is intentional and justified
- [ ] New features register deprecated feature ID as additional alerting consumer and cases owner
- [ ] Routes use `security.authz.requiredPrivileges`; deprecated feature's `api` array matches replacement's
- [ ] Client code uses new feature ID for capability checks (e.g. `capabilities.new_feature.ui_all`)
- [ ] Integration tests updated; Spaces feature visibility verified
- [ ] No privilege escalation or reduction; ZDT and rollback safe

For a `privilegeVersions` PR specifically, also check:

- [ ] Feature id and `deprecated` status are unchanged — this must NOT look like a deprecation PR
- [ ] The extracted sub-feature privilege's `includeIn` matches the privilege being versioned exactly
- [ ] Existing `privilegeVersions` entries are untouched (diff should be append-only)
- [ ] If this is a second (or later) extraction on the same privilege, a test proves a role customized between the two extractions keeps the later grant without regaining the earlier one

## Examples

For concrete code covering all deprecation scenarios (rename, split, sub-feature extraction, consolidation, alerting/cases) and the live-feature `privilegeVersions` extraction, read the test plugin:

`x-pack/platform/test/security_api_integration/plugins/features_provider/server/index.ts` — see `case3FeatureSplitSubFeature` for the whole-feature-deprecation version of a sub-feature extraction, and `case5FeatureExtractMinimalPrivilegeVersion` for the same extraction done live, via `privilegeVersions`, with two sequential extractions.

For real-world deprecations (discover, dashboard, visualize, maps):

`x-pack/platform/plugins/shared/features/server/oss_features.ts`

## Test Files

| File | Purpose |
|------|---------|
| `x-pack/platform/test/security_api_integration/tests/features/deprecated_features.ts` | Integration tests for whole-feature deprecation |
| `x-pack/platform/test/security_api_integration/tests/features/versioned_minimal_privileges.ts` | Integration tests for `privilegeVersions` |
| `x-pack/platform/plugins/shared/features/server/feature_registry.test.ts` | Unit tests for validation (both mechanisms) |
| `x-pack/platform/plugins/shared/security/server/authorization/roles/elasticsearch_role.test.ts` | Role deserialization tests (both mechanisms) |
| `x-pack/platform/packages/private/security/authorization_core/src/privileges/privileges.test.ts` | ES privilege registration/composition, incl. `privilegeVersions` |
| `x-pack/platform/packages/private/security/authorization_core_common/src/privileges/privilege_versions.test.ts` | The `privilegeVersions` id-resolution/composition algorithm in isolation |
| `x-pack/platform/packages/private/security/role_management_model/src/secured_feature.test.ts` | Client-side model exposing every minted minimal privilege id |

## Additional Resources

- For detailed type definitions and validation rules, see [references/reference.md](references/reference.md)
- PoC PR: [#kibana/186800](https://github.com/elastic/kibana/pull/186800)
- API authorization guide: `dev_docs/key_concepts/api_authorization.mdx`
