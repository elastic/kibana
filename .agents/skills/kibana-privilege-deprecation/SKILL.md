---
name: kibana-privilege-deprecation
description: Implement and review Kibana feature privilege deprecations. Use when deprecating features, renaming features, splitting features, consolidating features, moving privilege capabilities, reviewing deprecation PRs, or working with the replacedBy mapping system.
---

# Kibana Privilege Deprecation

Guides implementing and reviewing backward-compatible Kibana feature privilege deprecations using the deprecated privilege mapping framework.

## When to Use

- Renaming a feature (e.g. `alpha` -> `beta`)
- Splitting a feature into multiple features
- Consolidating multiple features into one
- Moving capabilities between feature/sub-feature privileges
- Reviewing PRs that deprecate features or change privilege mappings

## Key Concepts

- **Deprecated feature**: A feature marked with `deprecated` property that is frozen for backward compatibility. Not shown in role management UI; privileges still registered in Elasticsearch.
- **`replacedBy` mapping**: Links each deprecated privilege to equivalent non-deprecated privilege(s). Required on every privilege of a deprecated feature.
- **Lazy migration**: Roles are not auto-migrated. Deprecated privileges are replaced with current ones when an admin saves via UI.
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

## Validation Rules (Enforced at Startup)

Kibana will refuse to start if any of these are violated:

1. Deprecated features **must** define `replacedBy` on every privilege
2. Non-deprecated features **must not** define `replacedBy`
3. Referenced replacement features **must** exist and not be deprecated
4. Referenced replacement privileges **must** exist
5. Enabled privileges **cannot** be replaced with disabled ones
6. `feature.deprecated.replacedBy` feature IDs (if set) must be a subset of features used in privilege-level `replacedBy`

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

## Examples

For concrete code covering all deprecation scenarios (rename, split, sub-feature extraction, consolidation, alerting/cases), read the test plugin:

`x-pack/platform/test/security_api_integration/plugins/features_provider/server/index.ts`

For real-world deprecations (discover, dashboard, visualize, maps):

`x-pack/platform/plugins/shared/features/server/oss_features.ts`

## Test Files

| File | Purpose |
|------|---------|
| `x-pack/platform/test/security_api_integration/tests/features/deprecated_features.ts` | Integration tests for deprecated features |
| `x-pack/platform/plugins/shared/features/server/feature_registry.test.ts` | Unit tests for validation |
| `x-pack/platform/plugins/shared/security/server/authorization/roles/elasticsearch_role.test.ts` | Role deserialization tests |

## Additional Resources

- For detailed type definitions and validation rules, see [references/reference.md](references/reference.md)
- PoC PR: [#kibana/186800](https://github.com/elastic/kibana/pull/186800)
- API authorization guide: `dev_docs/key_concepts/api_authorization.mdx`
