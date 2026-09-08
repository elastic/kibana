# Privilege Deprecation Reference

## Type Definitions

### `KibanaFeatureConfig.deprecated`

Located in `x-pack/platform/plugins/shared/features/common/kibana_feature.ts`:

```ts
readonly deprecated?: Readonly<{
  // Mandatory, localizable, user-facing notice explaining why the feature is deprecated
  // and what should be used instead. Can include links to documentation.
  notice: string;

  // Optional list of feature IDs that conceptually replace this deprecated feature.
  // Used in Spaces feature visibility UI. By default derived from privilege-level replacedBy.
  // Override when privilege replacedBy references multiple features but only a subset
  // should appear in Spaces UI.
  replacedBy?: readonly string[];
}>;
```

### `FeatureKibanaPrivileges.replacedBy`

Located in `x-pack/platform/plugins/shared/features/common/feature_kibana_privileges.ts`:

```ts
// For top-level privileges (all, read) - supports separate default/minimal mappings
replacedBy?:
  | readonly FeatureKibanaPrivilegesReference[]
  | {
      default: readonly FeatureKibanaPrivilegesReference[];
      minimal: readonly FeatureKibanaPrivilegesReference[];
    };
```

**Two forms explained:**

- **Simple array form**: Applies the same replacement mapping to both `all`/`minimal_all` (or `read`/`minimal_read`). Only correct when the deprecated feature has **no sub-features**.
- **Extended `{ default, minimal }` form**: Required when the deprecated feature **has sub-features**. This is because:
  - `all` = `minimal_all` + all sub-feature privileges with `includeIn: 'all'`
  - `minimal_all` = only the top-level privilege, no sub-feature privileges
  - These two must map to different sets of replacement privileges to preserve the distinction.

If a deprecated feature has sub-features and you use the simple array form, the `minimal_all` mapping will incorrectly include sub-feature replacements, granting more access than intended.

### `SubFeaturePrivilegeConfig.replacedBy`

Located in `x-pack/platform/plugins/shared/features/common/sub_feature.ts`:

```ts
// For sub-feature privileges - only simple array form
replacedBy?: readonly FeatureKibanaPrivilegesReference[];
```

### `FeatureKibanaPrivilegesReference`

Located in `x-pack/platform/plugins/shared/features/common/feature_kibana_privileges_reference.ts`:

```ts
export interface FeatureKibanaPrivilegesReference {
  // The ID of the target (non-deprecated) feature
  feature: string;
  // IDs of feature or sub-feature privileges from that feature
  privileges: readonly string[];
}
```

## Validation Rules

Enforced in `feature_registry.ts` -> `validateFeatures()` after all features are registered:

| Rule | Error if violated |
|------|-------------------|
| Deprecated feature must define `replacedBy` on every privilege | `Feature "X" is deprecated and must define a "replacedBy" property for privilege "Y"` |
| Non-deprecated feature must NOT define `replacedBy` | `Feature "X" is not deprecated and must not define a "replacedBy" property for privilege "Y"` |
| Referenced replacement feature must exist | `Cannot replace privilege "Y" of deprecated feature "X" with privileges of feature "Z" since such feature is not registered` |
| Referenced replacement feature must not be deprecated | `...since the referenced feature is deprecated` |
| Referenced replacement privileges must exist | `...since such privilege is not registered` |
| Cannot replace enabled privilege with disabled one | `Cannot replace privilege "Y" of deprecated feature "X" with disabled privilege "Z" of feature "W"` |
| `feature.deprecated.replacedBy` must be non-empty if set | `...must have at least one feature ID` |
| `feature.deprecated.replacedBy` IDs must be used in privilege replacedBy | `...aren't used to replace feature privileges` |

## How Deprecated Privileges Work at Runtime

### Elasticsearch Registration
- Deprecated features' privileges are still registered as Elasticsearch application privileges
- Users with roles referencing deprecated privileges continue to pass authorization checks
- No automatic role migration occurs

### Role Deserialization (UI)
In `elasticsearch_role.ts` -> `deserializeKibanaFeaturePrivileges()`:
1. When `replaceDeprecatedKibanaPrivileges: true` (used by role management UI):
   - Deprecated privileges are resolved to their `replacedBy` targets
   - Only replacement privileges appear in the deserialized role
2. When `false` (default for APIs):
   - Deprecated privileges remain as-is in the role

### UI Capabilities
In `privileges.ts` -> privilege computation:
- Deprecated privileges generate UI actions from **both** the deprecated feature and its replacement features
- Client code should check replacement feature capabilities (e.g. `capabilities.feature_beta.ui_all`)
- Works for users with either deprecated or replacement privileges

### Spaces Feature Visibility
In `spaces_client.ts`:
- Deprecated features are excluded from enabled/disabled feature lists
- Replacement features are shown instead
- `feature.deprecated.replacedBy` (feature-level) controls which features appear

### API Authorization
- Routes using `security.authz.requiredPrivileges` continue to work with deprecated privileges
- API privileges from deprecated features remain valid in Elasticsearch
- When changing privilege names: update deprecated feature's `api` array to match replacement feature's entries
- Routes must use `security.authz.requiredPrivileges` to authorize access, covering both deprecated and replacement privilege holders

### Role Management APIs
- Deprecated privileges are still accepted in create/update role API requests
- This maintains backward compatibility for automation built around role APIs
- Deprecation warnings may be surfaced in future API responses
