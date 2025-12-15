# TopNavMenuBeta

`TopNavMenuBeta` is the replacement for the existing `TopNavMenu` component, providing an improved API and enhanced functionality for building top navigation menus in your application.

## Usage

- Using `core.navigation.ui` API:

```typescript
// In your plugin's start method
public start(core: CoreStart, plugins: PluginsStart) {
  const { ui } = plugins.navigation;
  // TODO: Define how to mount in header after upcoming extension point changes.
  return {
    renderTopNav: (props) => <ui.TopNavMenuBeta {...props} />
  };
}
```

- Direct import:

```typescript
import { TopNavMenuBeta} from '@kbn/navigation-plugin/public'

const MyComponent = (props: TopNavMenuConfigBeta) => {

  // TODO: Define how to mount in header after upcoming extension point changes.
  return <TopNavMenuBeta {...props} />
}
```

## API changes

`TopNavMenuBeta` offers a more restricted API than `TopNavMenu`

1. Decoupling from `UnifiedSearch` - top nav menu will no longer be bundled with unified search. You will need to directly import unified search and render it.

2. Removal of badges - badges will no longer be available in top nav menu. According to UX guidelines, current badges should be moved to use breadcrumbs extension API.

3. `items` can only be `EuiHeaderLink` (a button with type `text`). For more advanced use cases, use action buttons.

4. Action buttons - `TopNavMenuBeta` introduces action buttons:

    - `primaryActionButton` - this is meant to be used for primary actions (e.g saving), can be either an `EuiButton` or a split button, always placed as the rightmost item

    - `secondaryActionButton` - this is meant for secondary actions (e.g adding a new panel), can only be an `EuiButton`, placed to the left from `primaryActionButton`

5. Removal of `TopNavMenuExtensionsRegistry` - registering global items is no longer possible, add items locally to your application.
