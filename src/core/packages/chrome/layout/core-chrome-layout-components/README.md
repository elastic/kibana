# @kbn/core-chrome-layout-components

Composable React layout primitives for Kibana's Chrome application shell. Provides a modular, flexible, and accessible layout system using CSS Grid and Emotion styling.

## Features

- Modular layout regions: Header, Footer, Navigation, Sidebar, Banner, Application content
- Customizable dimensions for each region via context
- Slot-based API: pass React nodes or render functions for each region
- Responsive and accessible by design
- Foundation for Kibana's main UI layout

## API

### Components

- `ChromeLayout`: Main layout component, accepts slot props for each region
- `LayoutConfigProvider`: Context provider for layout dimensions

### Slot Props

All regions are passed as props to `ChromeLayout` Component. Each slot can be a React node or a function that receives the current layout state.

Available slots:

- `header`
- `footer`
- `navigation`
- `sidebar`
- `banner`
- `applicationTopBar`
- `applicationBottomBar`
- `children` (main application content)

### Layout Configuration

Wrap your layout in a `LayoutConfigProvider` to set region sizes:

```tsx
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';

<ChromeLayoutConfigProvider
  value={{
    bannerHeight: 32,
    headerHeight: 48,
    footerHeight: 24,
    navigationWidth: 200,
    sidebarWidth: 300,
    applicationTopBarHeight: 40,
    applicationBottomBarHeight: 36,
  }}
>
  <ChromeLayout
    header={<MyHeader />}
    footer={<MyFooter />}
    navigation={<MyNav />}
    sidebar={<MySidebar />}
    banner={<MyBanner />}
    applicationTopBar={<MyAppTopBar />}
    applicationBottomBar={<MyAppBottomBar />}
  >
    <AppContent />
  </ChromeLayout>
</ChromeLayoutConfigProvider>;
```

Each slot can also be a function: `header={state => <Header expanded={state.hasSidebar} />}`

---

## CSS Variables

This package exposes layout dimensions and positions as global CSS variables (custom properties) for dynamic theming and consistent styling across the application.

### Type-Safe Helpers (Recommended)

For the best developer experience, use the type-safe helpers from `@kbn/core-chrome-layout-constants`:

```typescript
import { layoutVar } from '@kbn/core-chrome-layout-constants';
import { css } from '@emotion/react';

const myComponentStyles = css`
  height: ${layoutVar('header-height')};
  margin-top: ${layoutVar('banner-height', '0px')};
  z-index: ${layoutVar('aboveFlyoutLevel')};
`;
```

See [`@kbn/core-chrome-layout-constants`](../core-chrome-layout-constants) for complete documentation.

### Manual Usage (Legacy)

You can also reference variables directly (though type-safe helpers are recommended):

```css
/* Manual usage - not recommended */
.my-component {
  height: var(--kbn-layout--header-height);
  margin-top: var(--kbn-layout--banner-height, 0px);
}
```

These variables are set at the `:root` level and update automatically based on the current layout state.

## Examples

See [Storybook stories](./__stories__/layout.stories.tsx) for more usage examples.
Run with `yarn storybook shared_ux` and look for "Layout" in the stories list.

## Types

See `layout.types.ts` for slot and layout state typings.
