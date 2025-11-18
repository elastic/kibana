# Pre-Requisite Changes Explanation

This document explains the changes made in commit `3bd438ce1d0ad926b4f18568782b648b1775dda0` ("[pre-req] Updates to existing components to support new toolbar and table") and their relevance to the Content List feature.

## Overview

This commit prepares existing Kibana content-management packages for the new Content List feature. It makes 7 files across 4 packages more flexible and exportable, enabling the Content List packages to consume these services optionally and gracefully.

## Changed Files

| File | Package |
|------|---------|
| `favorites_public/index.ts` | `@kbn/content-management-favorites-public` |
| `favorites_public/src/favorites_context.tsx` | `@kbn/content-management-favorites-public` |
| `user_profiles/index.ts` | `@kbn/content-management-user-profiles` |
| `user_profiles/src/components/user_missing_tip.tsx` | `@kbn/content-management-user-profiles` |
| `user_profiles/src/queries.ts` | `@kbn/content-management-user-profiles` |
| `user_profiles/src/services.tsx` | `@kbn/content-management-user-profiles` |
| `kbn-user-profile-components/src/user_profiles_selectable.tsx` | `@kbn/user-profile-components` |

## Detailed Changes

### 1. Favorites Package Exports

**Files:** `favorites_public/index.ts`, `favorites_public/src/favorites_context.tsx`

**Changes:**

- Exports `FavoritesContextProviderProps` and `FavoritesServices` types (previously internal).
- Refactors `FavoritesContextProvider` to use explicit prop typing with a named interface.

**Before:**

```tsx
interface FavoritesContextValue {
  favoritesClient?: FavoritesClientPublic;
  notifyError?: (title: JSX.Element, text?: string) => void;
}

export const FavoritesContextProvider: React.FC<React.PropsWithChildren<FavoritesContextValue>> = ({
  favoritesClient,
  notifyError,
  children,
}) => { /* ... */ };
```

**After:**

```tsx
export interface FavoritesServices {
  favoritesClient?: FavoritesClientPublic;
  notifyError?: (title: JSX.Element, text?: string) => void;
}

export interface FavoritesContextProviderProps extends FavoritesServices {
  children: React.ReactNode;
}

export const FavoritesContextProvider = ({
  favoritesClient,
  notifyError,
  children,
}: FavoritesContextProviderProps) => { /* ... */ };
```

**Relevance to Content List:**

The `FavoritesServices` type is imported and used in the Content List Provider to pass favorites functionality through the service layer:

```tsx
// kbn-content-list-provider/types.ts
import type { FavoritesServices } from '@kbn/content-management-favorites-public';

export interface ContentListServices {
  favorites?: FavoritesServices;
  // ...
}
```

This allows Content List consumers to optionally provide favorites support, enabling the "starred" filter and favoriting items in the table.

---

### 2. User Profiles `createBatcher` Export

**File:** `user_profiles/index.ts`

**Changes:**

- Exports `createBatcher` utility from `./src/utils/batcher`.

**Relevance to Content List:**

The `createBatcher` function is used in `kbn-content-list-provider/kibana_provider.tsx` to batch user profile lookups:

```tsx
// kbn-content-list-provider/kibana_provider.tsx
import { createBatcher } from '@kbn/content-management-user-profiles';

// ...
getUserProfile: createBatcher({
  // batches multiple profile requests into single bulk requests
})
```

This optimizes the "Created By" column rendering by batching multiple profile requests into single bulk requests, improving performance when displaying many items.

---

### 3. `NoCreatorTip` and `NoUpdaterTip` Refactoring

**File:** `user_profiles/src/components/user_missing_tip.tsx`

**Changes:**

- Converts from using `props` object spread to explicit destructuring.
- Removes the `{...props}` spread pattern.
- Fixes `iconType` typing for `NoUpdaterTip` (was `string`, now `IconType`).

**Before:**

```tsx
export const NoCreatorTip = (props: {
  iconType?: IconType;
  includeVersionTip?: boolean;
  entityNamePlural?: string;
}) => (
  <NoUsersTip
    content={/* uses props.includeVersionTip, props.entityNamePlural */}
    {...props}
  />
);

export const NoUpdaterTip = (props: {
  iconType?: string;  // Wrong type!
  // ...
}) => (/* ... */);
```

**After:**

```tsx
export const NoCreatorTip = ({
  iconType,
  includeVersionTip,
  entityNamePlural,
}: {
  iconType?: IconType;
  includeVersionTip?: boolean;
  entityNamePlural?: string;
}) => (
  <NoUsersTip
    iconType={iconType}
    content={/* uses includeVersionTip, entityNamePlural directly */}
  />
);

export const NoUpdaterTip = ({
  iconType,
  // ...
}: {
  iconType?: IconType;  // Fixed type
  // ...
}) => (/* ... */);
```

**Relevance to Content List:**

These components are used in the Content List Table and Toolbar to show tooltips when creator/updater information is unavailable:

- **Table:** `kbn-content-list-table/columns/created_by/created_by_cell.tsx` renders `<NoCreatorTip iconType="minus" />` when no creator UID exists.
- **Toolbar:** `kbn-content-list-toolbar/filters/renderers/created_by_renderer.tsx` uses `<NoCreatorTip>` in the "No creators" filter option.

The refactoring ensures clean prop handling and correct typing for these common UI patterns.

---

### 4. User Profiles Query Graceful Degradation

**File:** `user_profiles/src/queries.ts`

**Changes:**

- `useUserProfile` and `useUserProfiles` hooks now call `useUserProfilesServices({ strict: false })`.
- Queries are disabled when services are unavailable (`enabled: !!services`).
- Returns empty results instead of throwing when services aren't provided.

**Before:**

```tsx
export const useUserProfile = (uid: string) => {
  const { getUserProfile } = useUserProfilesServices();
  const query = useQuery(
    userProfileKeys.get(uid),
    async () => {
      return getUserProfile(uid);
    },
    { staleTime: Infinity }
  );
  return query;
};
```

**After:**

```tsx
export const useUserProfile = (uid: string) => {
  const services = useUserProfilesServices({ strict: false });
  const query = useQuery(
    userProfileKeys.get(uid),
    async () => {
      return services?.getUserProfile(uid);
    },
    {
      staleTime: Infinity,
      // Disable query if services are not available.
      enabled: !!services,
    }
  );
  return query;
};
```

**Relevance to Content List:**

This allows Content List to render user profile information (avatars, names in "Created By" columns) without requiring the `UserProfilesProvider` to be present. If user profile services aren't configured, the queries simply don't run rather than crashing the UI. This is essential for flexibility—not all Content List consumers may have user profiles configured.

---

### 5. `useUserProfilesServices` Non-Strict Mode

**File:** `user_profiles/src/services.tsx`

**Changes:**

- Adds a `strict` option (defaults to `true`).
- When `strict: false`, returns `undefined` instead of throwing an error if the provider is missing.
- Adds proper TypeScript overloads for type safety.

**Before:**

```tsx
export function useUserProfilesServices() {
  const context = useContext(UserProfilesContext);

  if (!context) {
    throw new Error(
      'UserProfilesContext is missing. Ensure your component or React root is wrapped with <UserProfilesProvider />'
    );
  }

  return context;
}
```

**After:**

```tsx
export interface UseUserProfilesServicesOptions {
  /**
   * If `true`, throws an error when the provider is missing.
   * If `false`, returns `undefined` when the provider is missing.
   * @default true
   */
  strict?: boolean;
}

export function useUserProfilesServices(opts: { strict: false }): UserProfilesServices | undefined;
export function useUserProfilesServices(opts?: UseUserProfilesServicesOptions): UserProfilesServices;
export function useUserProfilesServices(
  opts?: UseUserProfilesServicesOptions
): UserProfilesServices | undefined {
  const context = useContext(UserProfilesContext);
  const strict = opts?.strict ?? true;

  if (!context && strict) {
    throw new Error(
      'UserProfilesContext is missing. Ensure your component or React root is wrapped with <UserProfilesProvider />'
    );
  }

  return context ?? undefined;
}
```

**Relevance to Content List:**

This is the foundational change that enables the query changes above. It allows Content List components to optionally consume user profile services without requiring them to be present. The queries (`useUserProfile`, `useUserProfiles`) use `{ strict: false }` to gracefully degrade.

---

### 6. `UserProfilesSelectable` Compressed Search

**File:** `kbn-user-profile-components/src/user_profiles_selectable.tsx`

**Changes:**

- Adds new `searchCompressed` prop (defaults to `false`).
- Passes `compressed: searchCompressed` to the search input.

**Before:**

```tsx
export interface UserProfilesSelectableProps<Option extends UserProfileWithAvatar | null> {
  // ... existing props
  searchInputId?: string;
  // ...
}
```

**After:**

```tsx
export interface UserProfilesSelectableProps<Option extends UserProfileWithAvatar | null> {
  // ... existing props
  searchInputId?: string;

  /**
   * Whether the search field should be compressed.
   * @default false
   */
  searchCompressed?: boolean;
  // ...
}
```

**Relevance to Content List:**

The `UserProfilesSelectable` component is used in the Content List Toolbar's "Created By" filter popover. The `searchCompressed` prop allows the filter UI to use a smaller, more compact search input that fits better in the toolbar's filter popovers.

---

## Relationship to Subsequent Commits

| Subsequent Commit | Relevant Pre-req Change |
|-------------------|------------------------|
| **[Phase 1] Content List Provider** (`45a73a74`) | Uses `FavoritesServices` type, `createBatcher`, and `useUserProfilesServices({ strict: false })` pattern for optional user profile integration. |
| **[Phase 2.1] ContentListTable** (`00889652`) | Uses `NoCreatorTip` in the "Created By" column cell renderer. |
| **[Phase 2.2 + 2.3] ContentListToolbar** (`8dfb307e`) | Uses `NoCreatorTip` and `useUserProfiles` in the "Created By" filter renderer; uses `UserProfilesSelectable` with `searchCompressed`. |

---

## CODEOWNERS

| Files | Owner |
|-------|-------|
| `content-management/favorites/favorites_public/*` | **@elastic/appex-sharedux** |
| `content-management/user_profiles/*` | **@elastic/appex-sharedux** |
| `kbn-user-profile-components/*` | **@elastic/kibana-security** |

### Summary by Team

| Team | Changed Files |
|------|---------------|
| **@elastic/appex-sharedux** | 6 files (favorites and user_profiles packages) |
| **@elastic/kibana-security** | 1 file (`user_profiles_selectable.tsx`) |

---

## Summary

This commit is a **preparation/refactoring commit** that:

1. **Exports types** needed for Content List's service layer composition.
2. **Adds graceful degradation** for optional user profile services.
3. **Fixes typing and prop handling** for reused components.
4. **Exports utilities** (`createBatcher`) for optimized data fetching.
5. **Adds UI flexibility** (`searchCompressed`) for filter popovers.

Without these changes, the Content List packages would either need to duplicate code, require mandatory dependencies, or have less flexible APIs.

