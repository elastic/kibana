# unifiedDocViewer

This plugin contains services reliant on the plugin lifecycle for the unified doc viewer component (see @kbn/unified-doc-viewer).

## Storybook

Components in this package have [Storybook](https://storybook.js.org/) stories to show examples.

Run `yarn storybook unified_doc_viewer` from the Kibana root to start the local Storybook development server.

Storybooks on main are [published on build](https://ci-artifacts.kibana.dev/storybooks/main/unified_doc_viewer/index.html).

See the [@kbn-storybook documentation](/src/platform/packages/shared/kbn-storybook/README.md) for more information about Kibana integration with Storybook.

### Limitations

- The trace waterfall does not show in components since it's an Embeddable and we're not mocking everything out.
- The "(X% of trace)" component is never rendered because we are not fetching parent span data.

## Using Restorable State in Doc Viewer Tabs

Doc viewer tabs can maintain state when users navigate between different tabs or switch between Discover tabs (as long as the flyout remains open and selected document remains the same).

### When to Use

Use restorable state when your custom doc viewer tab needs to:

- Preserve user interactions (e.g., expanded sections, selected filters, searchValue, etc.)
- Maintain component state when switching between doc viewer tabs
- Maintain component state state when navigating between Discover tabs while the flyout is open

### Implementation

1. **Import the restorable state provider:**

```typescript
import { createRestorableStateProvider } from '@kbn/restorable-state';
```

2. **Define your state interface and create the provider:**

```typescript
interface MyDocViewState {
  expandedSections: string[];
  selectedFilter: string | null;
}

const { withRestorableState, useRestorableState } = createRestorableStateProvider<MyDocViewState>();
```

3. **Wrap your component with `withRestorableState` and use `useRestorableState` for state management:**

```typescript
export const MyDocView = withRestorableState((props) => {
  const [expandedSections, setExpandedSections] = useRestorableState('expandedSections', []);
  const [selectedFilter, setSelectedFilter] = useRestorableState('selectedFilter', null);

  return <div>{/* Your component implementation */}</div>;
});
```

4. **Register the component in your doc viewer:**

```typescript
registry.add({
  id: 'my_custom_doc_view',
  title: 'My Custom View',
  order: 10,
  render: (props) => <MyDocView {...props} />,
});
```

### State Lifecycle

- **Preserved:** When switching between doc viewer tabs or Discover tabs (flyout stays open)
- **Reset:** When the flyout is closed or a different document is displayed

### Example

See the example implementation in:

- Component: `src/platform/plugins/shared/discover/public/context_awareness/profile_providers/example/example_data_source_profile/components/restorable_state_doc_view.tsx`
- Profile: `src/platform/plugins/shared/discover/public/context_awareness/profile_providers/example/example_data_source_profile/profile.tsx`
