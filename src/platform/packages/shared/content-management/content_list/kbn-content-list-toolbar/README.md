# @kbn/content-list-toolbar

Toolbar component for content list UIs. Wraps `EuiSearchBar` with search and filter controls, integrating with `ContentListProvider` for configuration and sort state.

## Usage

The toolbar renders inside a `ContentListProvider` and auto-configures based on provider capabilities.

```tsx
import { ContentListToolbar } from '@kbn/content-list-toolbar';

// Smart defaults — renders available filters based on provider config.
<ContentListToolbar />
```

## Presets

The toolbar exposes its parts as compound components on `ContentListToolbar`.

### Filters (`ContentListToolbar.Filters`)

Container for filter presets. Accepts children to control order; auto-renders defaults when empty.

| Preset | Component | Status | Description |
|--------|-----------|--------|-------------|
| `sort` | `Filters.Sort` | Available | Sort dropdown populated from the provider's sorting config. |
| `tags` | `Filters.Tags` | Available | Tag include/exclude popover. Requires `services.tags` on the provider. |

#### Default filter order

Use the `Filters` component with no children to control where in the toolbar the default filters appear.

```tsx
const { Filters } = ContentListToolbar;

<ContentListToolbar>
  <Filters />
</ContentListToolbar>
```

#### Custom filter order

Use the `Filters` compound component to control which filters appear and in what order.

```tsx
const { Filters } = ContentListToolbar;

<ContentListToolbar>
  <Filters>
    <Filters.Tags />
    <Filters.Sort />
  </Filters>
</ContentListToolbar>
```

---

## Adding a new filter type

Adding a filter involves two independent concerns:

1. **Popover UI** — what appears when the user clicks the filter button.
2. **Query parser** — how typed filter syntax (e.g. `createdBy:alice`) is extracted from the search bar and mapped to `ActiveFilters`.

The two concerns are implemented separately and composed in the toolbar.

---

### Step 1 — Implement the popover renderer

A filter renderer is a React component that renders the popover UI. Use `SelectableFilterPopover` from this package for include/exclude-style filters.

```tsx
// kbn-content-list-toolbar/src/filters/users/user_filter_renderer.tsx

import React, { useMemo } from 'react';
import { Query } from '@elastic/eui';
import { SelectableFilterPopover, useFieldQueryFilter } from '@kbn/content-list-toolbar';
import { useUserProfileService } from '@kbn/content-management-user-profiles';

export const UserFilterRenderer = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => {
  const userService = useUserProfileService();
  const { selection, toggle, clearAll, activeCount } = useFieldQueryFilter({
    fieldName: 'createdBy',
    query,
    onChange,
  });

  const options = useMemo(
    () =>
      (userService?.getUserList() ?? []).map((user) => ({
        key: user.uid,
        label: user.displayName,
        value: user.username,
      })),
    [userService]
  );

  if (!userService) return null;

  return (
    <SelectableFilterPopover
      title="Created by"
      options={options}
      selection={selection}
      onToggle={toggle}
      onClearAll={clearAll}
      activeCount={activeCount}
    />
  );
};
```

Then declare it as a `Filters` preset so consumers can include it declaratively:

```ts
// kbn-content-list-toolbar/src/filters/users/user_filter.ts

import { filter } from '../part';
import { UserFilterRenderer } from './user_filter_renderer';

export const UserFilter = filter.createPreset({
  name: 'users',
  resolve: (_attributes, { hasUsers }) => {
    if (!hasUsers) return undefined;
    return { type: 'custom_component', component: UserFilterRenderer };
  },
});
```

Wire it into the auto-render defaults in `use_filters.ts` so it appears without any declarative configuration.

---

### Step 2 — Implement a `QueryParser`

When a user types `createdBy:alice` directly into the search bar, the toolbar must extract that clause, resolve `alice` to a user ID, and merge it into `ActiveFilters.createdBy`. This is the job of a `QueryParser`.

A `QueryParser` receives the raw `EuiSearchBar` query text (already cleaned by any preceding parsers in the chain) and returns:

- `searchQuery` — the text with its field clauses removed (passed to the next parser and ultimately to `findItems`).
- `filters` — a partial `ActiveFilters` object. Return an empty object `{}` when no clauses are found — this clears the filter dimension, which is correct since the search bar is the authoritative source of truth.

```ts
// kbn-content-list-toolbar/src/filters/users/use_user_query_parser.ts

import { useMemo } from 'react';
import { useUserProfileService } from '@kbn/content-management-user-profiles';
import type { QueryParser, QueryParserResult } from '@kbn/content-list-toolbar';

export const useUserQueryParser = (): QueryParser | null => {
  const userService = useUserProfileService();

  return useMemo((): QueryParser | null => {
    if (!userService?.parseSearchQuery) return null;

    const { parseSearchQuery } = userService;

    return {
      parse(queryText: string): QueryParserResult {
        const { searchQuery, userIds } = parseSearchQuery(queryText);
        return {
          searchQuery,
          filters: userIds?.length ? { createdBy: { include: userIds } } : {},
        };
      },
    };
  }, [userService]);
};
```

> The `QueryParser` interface and `parseFiltersFromQuery` pipeline are exported from `@kbn/content-list-toolbar`. Import them to implement or test a parser outside this package.

---

### Step 3 — Register the parser in the toolbar

Open [`content_list_toolbar.tsx`](src/content_list_toolbar.tsx) and add the new parser to the `queryParsers` array. This is the **only file that needs to change** when adding a new filter type.

```ts
// content_list_toolbar.tsx

const tagParser = useTagQueryParser();
const userParser = useUserQueryParser();          // ← add this

const queryParsers = useMemo(
  (): ReadonlyArray<QueryParser> =>
    [tagParser, userParser].filter((p): p is QueryParser => p !== null),   // ← add userParser
  [tagParser, userParser]
);
```

Parsers run in the order listed. Each receives the cleaned text from the previous. Order matters when field names might overlap — but for disjoint field names, order is irrelevant.

---

### How the pipeline works

`parseFiltersFromQuery(queryText, parsers)` reduces over the parsers array:

```
queryText = "my query tag:(Production) createdBy:alice"

tag parser:
  → extracts tag:(Production), resolves to tag-1
  → searchQuery = "my query createdBy:alice"
  → filters = { tag: { include: ['tag-1'] } }

user parser:
  → extracts createdBy:alice, resolves to uid-42
  → searchQuery = "my query"
  → filters = { createdBy: { include: ['uid-42'] } }

result:
  → setSearch(queryText, { search: 'my query', tag: { include: ['tag-1'] }, createdBy: { include: ['uid-42'] } })
```

Each parser only removes its own field syntax. The final `searchQuery` is sent to `findItems` as plain text.

---

### Testing a `QueryParser`

`parseFiltersFromQuery` is a pure function — test it directly without React or a toolbar:

```ts
import { parseFiltersFromQuery } from '@kbn/content-list-toolbar';

describe('useCreatedByQueryParser', () => {
  it('extracts createdBy clauses and resolves to IDs', () => {
    const parser = {
      parse: (queryText: string) => {
        // minimal inline implementation for the test
        const match = queryText.match(/createdBy:(\S+)/);
        return {
          searchQuery: queryText.replace(/createdBy:\S+\s*/g, '').trim(),
          filters: match ? { createdBy: { include: [`uid-${match[1]}`] } } : {},
        };
      },
    };

    const result = parseFiltersFromQuery('my query createdBy:alice', [parser]);

    expect(result.searchQuery).toBe('my query');
    expect(result.filters).toEqual({ createdBy: { include: ['uid-alice'] } });
  });

  it('clears createdBy filter when no clause is present', () => {
    const parser = { parse: (q: string) => ({ searchQuery: q, filters: {} }) };
    const result = parseFiltersFromQuery('plain search', [parser]);
    expect(result.filters).toEqual({});
  });
});
```

---

### Checklist for a new filter

- [ ] Renderer component using `SelectableFilterPopover` + `useFieldQueryFilter`.
- [ ] Preset declared with `filter.createPreset` and wired into the auto-render defaults.
- [ ] `useXxxQueryParser` hook implementing `QueryParser`, calling the service's own `parseSearchQuery`.
- [ ] Parser added to the `queryParsers` array in `content_list_toolbar.tsx`.
- [ ] `filterDisplay` flag (`hasUsers`, `hasStarred`, etc.) added to `useFilterDisplay`.
- [ ] `findItems` updated in the consumer (or mock datasource) to act on the new filter dimension.
