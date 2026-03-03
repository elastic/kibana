# @kbn/core-chrome-layout-components

React layout primitives for Kibana's Chrome application shell using CSS Grid.

## Quick Usage

```tsx
import { ChromeLayout, ChromeLayoutConfigProvider } from '@kbn/core-chrome-layout-components';

<ChromeLayoutConfigProvider value={{ headerHeight: 48, navigationWidth: 200 }}>
  <ChromeLayout header={<MyHeader />} navigation={<MyNav />} sidebar={<MySidebar />}>
    <AppContent />
  </ChromeLayout>
</ChromeLayoutConfigProvider>;
```

## Features

- **Modular regions**: Header, footer, navigation, sidebar, banner, application content
- **Flexible sizing**: Configurable dimensions via context provider
- **Slot-based API**: Pass React nodes or render functions
- **CSS variables**: Automatic layout variable generation

## CSS Variables

Use type-safe helpers from [`@kbn/core-chrome-layout-constants`](../core-chrome-layout-constants):

```typescript
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const styles = css`
  height: ${layoutVar('header.height')};
  margin-top: ${layoutVar('banner.height', '0px')};
`;
```

## Documentation

- **Components**: See [`layout.types.ts`](./layout.types.ts) for props and configuration
- **Examples**: View [`__stories__/layout.stories.tsx`](./__stories__/layout.stories.tsx)
- **Storybook**: Run `yarn storybook shared_ux` → "Layout"
- **Architecture**: See [`layout_overview.mdx`](../layout_overview.mdx)
