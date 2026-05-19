# @kbn/shared-url-state

Hooks that bind UI state to URL query parameters via Kibana's scoped history, so browser Back/Forward restores the state.

## useBooleanUrlState

Binds a boolean value to a URL query parameter. Useful anywhere you'd persist a "shown / hidden" or "on / off" state across navigation — flyouts, modals, panels, drawers, expanded filter sections, debug toggles, and so on.

Must be called inside a `<Router>`.

Opening pushes a history entry so Back closes; closing replaces the entry and removes the param from the URL.

```tsx
import { useBooleanUrlState } from '@kbn/shared-url-state';

function FilterPanel() {
  const [isExpanded, setIsExpanded] = useBooleanUrlState('filtersExpanded');

  return (
    <>
      <EuiButton onClick={() => setIsExpanded(!isExpanded)}>
        {isExpanded ? 'Hide' : 'Show'} filters
      </EuiButton>
      {isExpanded && <FilterControls />}
    </>
  );
}
```

### Notes

- Each hook instance must use a unique `paramName` within the app. Two hooks sharing the same name will fight over the URL slot.
- Multiple independent booleans (e.g. several flyouts) each push their own history entry — pressing Back walks them in LIFO order.
