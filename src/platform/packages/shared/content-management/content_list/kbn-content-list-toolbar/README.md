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

#### Default filter order

Use the `Filters` component with no children to control where in the Toolbar the default filters will appear.

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
    <Filters.Sort />
  </Filters>
</ContentListToolbar>
```