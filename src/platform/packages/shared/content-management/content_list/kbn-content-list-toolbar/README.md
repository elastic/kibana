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
| `starred` | `Filters.Starred` | Available | Starred toggle (`is:starred`). Requires `services.favorites` on the provider. |
| `createdBy` | `Filters.CreatedBy` | Available | User popover with profile avatars. Requires `services.userProfiles` on the provider. |

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
2. **Field / flag definition** — how typed filter syntax (e.g. `createdBy:alice`) is parsed from `queryText` into the `ContentListQueryModel` and converted to `ActiveFilters` for the data source.

The popover lives in this package. The query parsing lives in `@kbn/content-list-provider`'s query model pipeline (see [`HOW_IT_WORKS.md`](../HOW_IT_WORKS.md) for the full flow).

---

### Step 1 — Register a field or flag definition

The query model pipeline in `@kbn/content-list-provider` parses `queryText` into a structured `ContentListQueryModel` using registered `FieldDefinition` and `FlagDefinition` entries.

For **built-in** dimensions, add the definition in `query_model/field_definitions.ts`. For **consumer-specific** dimensions, pass them via the `features.fields` or `features.flags` props on `ContentListProvider`:

```tsx
<ContentListProvider
  features={{
    fields: [{
      fieldName: 'updatedBy',
      resolveIdToDisplay: (uid) => store.resolve(uid)?.email ?? uid,
      resolveDisplayToId: (display) => store.getAll().find(u => u.email === display)?.uid,
      resolveFuzzyDisplayToIds: (partial) =>
        store.getAll()
          .filter(u => u.email.includes(partial) || u.fullName.includes(partial))
          .map(u => u.uid),
    }],
    flags: [{
      flagName: 'managed',
      modelKey: 'managed',
    }],
  }}
/>
```

The `toFindItemsFilters()` bridge is generic — it maps any `model.filters[fieldName]` to `activeFilters[fieldName]` automatically. No changes needed unless the field requires special mapping.

---

### Step 2 — Implement the popover renderer

A filter renderer is a React component that renders the popover UI. Use `SelectableFilterPopover` from this package for include/exclude-style filters, and `useFilterFacets` from `@kbn/content-list-provider` to lazily fetch display-ready facets.

```tsx
// kbn-content-list-toolbar/src/filters/my_field/my_field_filter_renderer.tsx

import React from 'react';
import { useFilterFacets, useFilterToggle } from '@kbn/content-list-provider';
import { SelectableFilterPopover } from '../selectable_filter_popover';

export const MyFieldFilterRenderer = () => {
  const facetsQuery = useFilterFacets('myField');
  const toggle = useFilterToggle('myField');

  return (
    <SelectableFilterPopover
      title="My Field"
      isLoading={facetsQuery.isLoading}
      options={(facetsQuery.data ?? []).map((facet) => ({
        key: facet.key,
        label: facet.label,
        count: facet.count,
      }))}
      onToggle={(key) => toggle(key)}
    />
  );
};
```

Then declare it as a `Filters` preset so consumers can include it declaratively:

```ts
// kbn-content-list-toolbar/src/filters/my_field/my_field_filter.ts

import { filter } from '../part';
import { MyFieldFilterRenderer } from './my_field_filter_renderer';

export const MyFieldFilter = filter.createPreset({
  name: 'myField',
  resolve: (_attributes, { hasMyField }) => {
    if (!hasMyField) return undefined;
    return { type: 'custom_component', component: MyFieldFilterRenderer };
  },
});
```

Wire it into the auto-render defaults in `use_filters.ts` so it appears without any declarative configuration.

---

### Step 3 — Supply a `FilterFacetConfig` (for popover counts)

To populate the popover with counts, supply a `FilterFacetConfig` for the feature. The client provider (`@kbn/content-list-provider-client`) auto-builds these for tags and user profiles. For custom fields, pass the config via `features`:

```tsx
<ContentListProvider
  features={{
    myField: {
      getFacets: async ({ filters }) => {
        const items = filterItems(getItems(), filters);
        return computeMyFieldFacets(items);
      },
    },
  }}
/>
```

`useFilterFacets('myField')` in the popover renderer will call this `getFacets` lazily when the popover opens.

---

### How the query model pipeline works

`queryText` flows through a single pipeline in `@kbn/content-list-provider`:

```
queryText = "my query tag:(Production) createdBy:alice"
         ↓
    useQueryModel(queryText)
         ↓
    parseQueryText(queryText, fields, flags, schema)
         ↓  extracts known fields/flags via EUI Query AST
    ContentListQueryModel {
      search: "my query",
      filters: { tag: { include: ['tag-1'], exclude: [] }, createdBy: { include: ['uid-42'], exclude: [] } },
      flags: {}
    }
         ↓
    toFindItemsFilters(model)
         ↓
    ActiveFilters { search: "my query", tag: { include: ['tag-1'] }, createdBy: { include: ['uid-42'] } }
```

Unknown field syntax (e.g. `owner:(alice or bob)`) is preserved verbatim in `search` and passed through to `findItems` untouched.

---

### Checklist for a new filter

- [ ] `FieldDefinition` or `FlagDefinition` registered (built-in in `field_definitions.ts`, or consumer-specific via `features.fields`/`features.flags`).
- [ ] Renderer component using `SelectableFilterPopover` + `useFilterFacets`.
- [ ] Preset declared with `filter.createPreset` and wired into the auto-render defaults.
- [ ] `FilterFacetConfig` supplied (auto-built by client provider for tags/profiles, or via `features` prop).
- [ ] Feature flag added to `ContentListSupports` (e.g. `myField: true`).
- [ ] `findItems` updated in the consumer (or mock datasource) to act on the new filter dimension.
