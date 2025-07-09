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
  ChromeLayoutConfigProvider,
} from '@kbn/core-chrome-layout-components';

<ChromeLayoutConfigProvider
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
  <ChromeLayout
    header={<MyHeader />}
    footer={<MyFooter />}
    navigation={<MyNav />}
    navigationPanel={<MyNavPanel />}
    sidebar={<MySidebar />}
    sidebarPanel={<MySidebarPanel />}
    banner={<MyBanner />}
  >
    <AppContent />
  </ChromeLayout>
</ChromeLayoutConfigProvider>;
```

Each slot can also be a function: `header={state => <Header expanded={state.hasSidebar} />}`

---

## CSS Variables

This package exposes layout dimensions and positions as global CSS variables (custom properties) for dynamic theming and consistent styling across the application. You can use these variables in your own CSS to align custom components with the layout or implement advanced theming.

**Available CSS variables:**

- **Banner**
  - `--kbn-layout--banner-top`
  - `--kbn-layout--banner-left`
  - `--kbn-layout--banner-height`
  - `--kbn-layout--banner-width`
- **Header**
  - `--kbn-layout--header-top`
  - `--kbn-layout--header-left`
  - `--kbn-layout--header-height`
  - `--kbn-layout--header-width`
- **Navigation**
  - `--kbn-layout--navigation-top`
  - `--kbn-layout--navigation-height`
  - `--kbn-layout--navigation-width`
  - `--kbn-layout--navigation-panel-width`
- **Sidebar**
  - `--kbn-layout--sidebar-top`
  - `--kbn-layout--sidebar-height`
  - `--kbn-layout--sidebar-width`
  - `--kbn-layout--sidebar-panel-width`
- **Application**
  - `--kbn-layout--application-top`
  - `--kbn-layout--application-bottom`
  - `--kbn-layout--application-left`
  - `--kbn-layout--application-right`
  - `--kbn-layout--application-height`
  - `--kbn-layout--application-width`
- **Footer**
  - `--kbn-layout--footer-top`
  - `--kbn-layout--footer-left`
  - `--kbn-layout--footer-height`
  - `--kbn-layout--footer-width`

These variables are set at the `:root` level and update automatically based on the current layout state.

## Examples

See [Storybook stories](./__stories__/layout.stories.tsx) for more usage examples.
Run with `yarn storybook sharedux` and look for "Layout" in the stories list.

## Types

See `layout.types.ts` for slot and layout state typings.
