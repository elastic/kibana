# Proposal: Fuzzy User Profile Filtering for createdBy

**Status:** Draft  
**Date:** 2024-12-08  
**Author:** Content Management Team

## Overview

This proposal outlines the implementation of fuzzy/substring matching for the `createdBy` filter in ContentList. This allows users to type partial names or email addresses in the search box and have matching creators filtered automatically.

## Background

### Current State (Phase 1 - Completed)

The `createdBy` filter now writes **email addresses** instead of user IDs to the query:

```
# Before (legacy)
createdBy:(u_665722084_cloud)

# After (Phase 1)
createdBy:(jane.doe@elastic.co)
```

**Phase 1 Changes:**
- `created_by.tsx` now uses email (or uid as fallback) when selecting users from the flyout
- Lookup maps support both email and uid for backwards compatibility
- The search box displays human-readable email addresses

### Limitation

Phase 1 only supports **exact matching** on email or uid. Users cannot:
- Type partial names like `createdBy:(jake)` to match "Jake Smith"
- Use substring matching on email like `createdBy:(@elastic.co)` to match all Elastic employees
- Get OR-style matching when a fuzzy term matches multiple users

### Goal

Enable fuzzy matching so users can type:
```
createdBy:(jake)     → Matches all users whose name or email contains "jake"
createdBy:(elastic)  → Matches all users with "elastic" in their email
-createdBy:(admin)   → Excludes users with "admin" in their name/email
```

## Technical Challenges

### Challenge 1: User Profile Availability

User profiles are currently fetched **lazily** (only when the filter popover opens):

```typescript
// In created_by.tsx
const query = useUserProfiles(allUserIds, { enabled: isPopoverOpen });
```

For fuzzy matching at query time, we need profiles available during query parsing/filtering.

### Challenge 2: Resolution Location

The `createdBy` filter value flows through multiple layers:

```
┌─────────────────────────────────────────────────────────────────┐
│  1. UI Layer (created_by.tsx)                                   │
│     - User clicks in popover → writes email to query            │
│     - OR user types in search box → writes fuzzy term           │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Query Parsing Layer (queries.ts)                            │
│     - Extracts createdBy values from query text                 │
│     - Builds filters.users array                                │
│     ★ RESOLUTION COULD HAPPEN HERE ★                            │
└────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. Datasource Layer                                            │
│     - Receives filters.users                                    │
│     - Filters items where item.createdBy matches                │
│     ★ OR RESOLUTION COULD HAPPEN HERE ★                         │
└────────────────────────────────────────────────────────────────┘
```

**Option A: Provider-Level Resolution**
- Pros: Datasource API unchanged, consistent behavior
- Cons: Requires profile fetching during query, adds latency

**Option B: Datasource-Level Resolution**
- Pros: Most flexible, can leverage server-side search
- Cons: Every datasource must implement, inconsistent UX

### Challenge 3: Distinguishing Exact vs Fuzzy

When parsing `createdBy:(jake)`, how do we know if:
- User explicitly selected "jake@elastic.co" from flyout (exact match)
- User typed "jake" in search box (fuzzy match)

## Proposed Solution

### Architecture: Provider-Level Resolution with Caching

```
┌─────────────────────────────────────────────────────────────────┐
│                    ContentListProvider                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  UserProfileCache                                         │  │
│  │  - Fetches profiles for all item creators on mount        │  │
│  │  - Builds lookup maps: uid → profile, email → profile     │  │
│  │  - Provides fuzzy search: searchProfiles(term) → uids[]   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CreatedByResolver                                        │  │
│  │  - Receives raw filter values from query parser           │  │
│  │  - Resolves to user IDs using cache                       │  │
│  │  - Handles exact (email) and fuzzy (substring) matching   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                               ↓                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Datasource                                               │  │
│  │  - Receives resolved user IDs (always exact)              │  │
│  │  - Simple equality check: item.createdBy === uid          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation Plan

#### Step 1: Create User Profile Cache Service

Add to `@kbn/content-list-provider`:

```typescript
// features/user_profiles/user_profile_cache.ts

interface UserProfileCacheOptions {
  /** User IDs to pre-fetch (typically from item.createdBy values) */
  userIds: string[];
}

interface UserProfileCacheState {
  /** Map of uid → UserProfile */
  profilesByUid: Map<string, UserProfile>;
  /** Map of email → UserProfile */
  profilesByEmail: Map<string, UserProfile>;
  /** All profiles as array */
  profiles: UserProfile[];
  /** Loading state */
  isLoading: boolean;
}

interface UserProfileCacheActions {
  /**
   * Search profiles by fuzzy term (matches name, email, username)
   * Returns matching user IDs
   */
  searchProfiles: (term: string) => string[];
  
  /**
   * Resolve a filter value to user ID(s)
   * - Exact email → single uid
   * - Exact uid → single uid  
   * - Fuzzy term → multiple uids
   */
  resolveToUserIds: (filterValue: string) => string[];
  
  /**
   * Check if a value is an exact match (email or uid) vs fuzzy term
   */
  isExactMatch: (value: string) => boolean;
}

export function useUserProfileCache(
  options: UserProfileCacheOptions
): UserProfileCacheState & UserProfileCacheActions;
```

#### Step 2: Integrate Cache with Provider

```typescript
// state/state_provider.tsx

export const ContentListStateProvider = ({ children }: ContentListStateProviderProps) => {
  // ... existing code ...
  
  // Fetch user profiles for all item creators
  const allCreatorIds = useMemo(() => {
    const ids = new Set<string>();
    localState.items.forEach(item => {
      if (item.createdBy) ids.add(item.createdBy);
    });
    return Array.from(ids);
  }, [localState.items]);
  
  const profileCache = useUserProfileCache({ userIds: allCreatorIds });
  
  // ... pass cache to context ...
};
```

#### Step 3: Add Resolution to Query Layer

```typescript
// queries.ts

export function useContentListItemsQuery<T>({
  // ... existing params ...
  profileCache,
}: UseContentListItemsQueryParams<T>) {
  
  // ... existing query parsing ...
  
  // Resolve createdBy filter values to user IDs
  const resolvedUsers = useMemo(() => {
    if (!parsedUsers || parsedUsers.length === 0) return undefined;
    
    // Resolve each filter value (exact or fuzzy) to user IDs
    return parsedUsers.flatMap(value => profileCache.resolveToUserIds(value));
  }, [parsedUsers, profileCache]);
  
  // ... pass resolvedUsers to datasource ...
}
```

#### Step 4: Update CreatedBy Filter UI

```typescript
// filters/created_by.tsx

// When user types manually in search box, preserve the raw term
// When user selects from popover, use email for exact match

const handleSelectionChange = useCallback(
  (options: Array<UserProfile | null>) => {
    const newSelectedUsers = options.map((option) => {
      if (!option) return NULL_USER;
      // Use email for exact matching (selected from UI)
      return option.user.email || option.uid;
    });
    setUsers(newSelectedUsers);
  },
  [setUsers]
);

// The search box already allows typing arbitrary values
// Those will be passed through as fuzzy terms
```

### Resolution Logic

```typescript
function resolveToUserIds(filterValue: string, cache: UserProfileCache): string[] {
  // 1. Check for exact email match
  const profileByEmail = cache.profilesByEmail.get(filterValue);
  if (profileByEmail) {
    return [profileByEmail.uid];
  }
  
  // 2. Check for exact uid match
  const profileByUid = cache.profilesByUid.get(filterValue);
  if (profileByUid) {
    return [profileByUid.uid];
  }
  
  // 3. Fuzzy search by name/email substring
  const searchTerm = filterValue.toLowerCase();
  const matches = cache.profiles.filter(profile => {
    const searchString = [
      profile.uid,
      profile.user.username,
      profile.user.email ?? '',
      profile.user.full_name ?? '',
    ].join(' ').toLowerCase();
    
    return searchString.includes(searchTerm);
  });
  
  return matches.map(p => p.uid);
}
```

### Handling Edge Cases

#### No Matches Found

If fuzzy term matches no users:
- Return empty array → no items match
- Consider: Show warning in UI?

#### Multiple Matches (OR Logic)

If `createdBy:(jake)` matches 3 users:
- Return all 3 user IDs
- Datasource filters items where `createdBy` is ANY of the 3 IDs
- This provides intuitive OR behavior

#### Mixed Exact and Fuzzy

Query: `createdBy:(jane.doe@elastic.co OR jake)`
- `jane.doe@elastic.co` → exact match → 1 uid
- `jake` → fuzzy match → N uids
- Result: union of all uids

#### Legacy UID Queries (Backwards Compatibility)

Old bookmarks/URLs may contain `createdBy:(u_xxx)`:
- Step 2 checks for exact uid match
- Returns that uid directly
- No breaking change for existing queries

## Performance Considerations

### User Profile Fetching

**Concern:** Fetching all creator profiles on mount could be expensive.

**Mitigations:**
1. **Lazy Loading:** Only fetch when filtering is enabled in config
2. **Caching:** Use React Query with infinite staleTime
3. **Batching:** Existing batcher utility handles request deduplication
4. **Pagination:** For very large datasets, limit to visible page's creators

```typescript
// Only fetch profiles when users filter is enabled
const isUsersFilterEnabled = config.filtering?.users === true;
const profileCache = useUserProfileCache({ 
  userIds: isUsersFilterEnabled ? allCreatorIds : [],
  enabled: isUsersFilterEnabled,
});
```

### Search Performance

**Concern:** Fuzzy matching against many profiles could be slow.

**Mitigations:**
1. **Memoization:** Cache search results by term
2. **Debouncing:** Debounce search input (already in place)
3. **Indexing:** For large user counts, consider search index

## Testing Strategy

### Unit Tests

```typescript
describe('useUserProfileCache', () => {
  it('resolves exact email to single uid', () => {
    const cache = createMockCache(MOCK_USER_PROFILES);
    expect(cache.resolveToUserIds('jane.doe@elastic.co')).toEqual(['u_jane_doe']);
  });
  
  it('resolves exact uid to itself', () => {
    const cache = createMockCache(MOCK_USER_PROFILES);
    expect(cache.resolveToUserIds('u_jane_doe')).toEqual(['u_jane_doe']);
  });
  
  it('resolves fuzzy term to multiple matching uids', () => {
    const cache = createMockCache(MOCK_USER_PROFILES);
    // Both "jane.doe@elastic.co" and "john.smith@elastic.co" contain "elastic"
    const result = cache.resolveToUserIds('elastic');
    expect(result).toContain('u_jane_doe');
    expect(result).toContain('u_john_smith');
  });
  
  it('returns empty array for no matches', () => {
    const cache = createMockCache(MOCK_USER_PROFILES);
    expect(cache.resolveToUserIds('nonexistent')).toEqual([]);
  });
});
```

### Integration Tests

```typescript
describe('CreatedBy filter with fuzzy matching', () => {
  it('filters items when typing partial name', async () => {
    render(<ContentList />);
    
    // Type fuzzy term in search box
    await userEvent.type(searchBox, 'createdBy:(jane)');
    
    // Should show items created by Jane Doe
    expect(screen.getByText('Jane\'s Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('John\'s Dashboard')).not.toBeInTheDocument();
  });
  
  it('supports exclude with fuzzy matching', async () => {
    render(<ContentList />);
    
    // Exclude all users with "admin" in name
    await userEvent.type(searchBox, '-createdBy:(admin)');
    
    // Should hide items by admin users
    expect(screen.queryByText('Admin Dashboard')).not.toBeInTheDocument();
  });
});
```

## Migration Path

### Backwards Compatibility

- Existing `createdBy:(u_xxx)` queries continue to work (exact uid match)
- New email-based queries from Phase 1 work (exact email match)
- Fuzzy queries are additive (no breaking changes)

### Rollout

1. **Feature Flag:** Initially behind a feature flag for testing
2. **Gradual Rollout:** Enable for specific content types first
3. **Documentation:** Update search syntax documentation

## Alternatives Considered

### Alternative 1: Server-Side Fuzzy Search

Have the datasource/server handle fuzzy user matching.

**Pros:**
- No client-side profile fetching
- Scales to large user counts
- Could leverage Elasticsearch

**Cons:**
- Requires API changes to support fuzzy user filter
- Each datasource must implement
- Inconsistent behavior across datasources

**Decision:** Rejected in favor of client-side resolution for consistency.

### Alternative 2: Autocomplete Suggestion

Instead of fuzzy matching, suggest exact matches as user types.

**Pros:**
- No ambiguity in filtering
- Clear UI feedback

**Cons:**
- Slower UX (must select from suggestions)
- Doesn't support URL-based fuzzy queries

**Decision:** Could be added as enhancement, but fuzzy matching still valuable.

### Alternative 3: Separate Search Syntax

Use different syntax for fuzzy vs exact: `createdBy:(exact:email)` vs `createdBy:(fuzzy:jake)`

**Pros:**
- Explicit intent
- No ambiguity

**Cons:**
- More complex syntax to learn
- Verbose

**Decision:** Rejected in favor of automatic detection.

## Timeline Estimate

| Phase | Task | Estimate |
|-------|------|----------|
| 1 | Create UserProfileCache service | 2 days |
| 2 | Integrate cache with provider | 1 day |
| 3 | Add resolution to query layer | 2 days |
| 4 | Update tests | 2 days |
| 5 | Documentation | 1 day |
| **Total** | | **~8 days** |

## Open Questions

1. **Performance Threshold:** At what user count should we switch to server-side search?
2. **Empty Results UX:** Should we show a warning when fuzzy term matches no users?
3. **Suggestion UI:** Should we add autocomplete suggestions for fuzzy terms?

## Conclusion

Fuzzy user profile filtering provides significant UX improvement for the `createdBy` filter. The proposed client-side resolution approach maintains a clean datasource API while enabling powerful search capabilities. Implementation is straightforward given the existing infrastructure.

**Recommendation:** Proceed with implementation after Phase 1 is validated in production.

