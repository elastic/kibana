# @kbn/core-chrome-layout-components

Composable React layout primitives for Kibana's Chrome application shell. Provides a modular, flexible, and accessible layout system using CSS Grid and Emotion styling.

## Features

- Modular layout regions: Header, Footer, Navigation, Sidebar, Banner, Navigation Panel, Sidebar Panel, Application content
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
- `navigationPanel`
- `sidebar`
- `sidebarPanel`
- `banner`
- `children` (application content)

### Layout Configuration

Wrap your layout in a `LayoutConfigProvider` to set region sizes:

```tsx
import {
  ChromeLayout,
  LayoutConfigProvider,
} from '@kbn/core-chrome-layout-components';

<LayoutConfigProvider
  value={{
    bannerHeight: 32,
    headerHeight: 48,
    footerHeight: 24,
    navigationWidth: 200,
    navigationPanelWidth: 240,
    sidebarWidth: 300,
    sidebarPanelWidth: 280,
  }}
>
  <ChromeLayoutComponent
    header={<MyHeader />}
    footer={<MyFooter />}
    navigation={<MyNav />}
    navigationPanel={<MyNavPanel />}
    sidebar={<MySidebar />}
    sidebarPanel={<MySidebarPanel />}
    banner={<MyBanner />}
  >
    <AppContent />
  </ChromeLayoutComponent>
</LayoutConfigProvider>;
```

Each slot can also be a function: `header={state => <Header expanded={state.hasSidebar} />}`

## Examples

See [Storybook stories](./__stories__/layout.stories.tsx) for more usage examples.
Run with `yarn storybook sharedux` and look for "Layout" in the stories list.

## Types

See `layout.types.ts` for slot and layout state typings.
