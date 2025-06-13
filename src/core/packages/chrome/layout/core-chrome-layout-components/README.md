# @kbn/core-chrome-layout-components

This package provides composable React layout components for Kibana's Chrome application shell, including header, footer, navigation, banner, sidebar, and application content regions. It enables consistent, flexible page layouts using CSS Grid and Emotion styling.

## Features
- Modular layout primitives: Header, Footer, Navigation, Sidebar, Banner, Application area, and more
- Customizable dimensions for each region
- Responsive and accessible by design
- Used as the foundation for Kibana's main UI layout

## Usage
```tsx
import { ChromeLayout } from '@kbn/core-chrome-layout-components';

<ChromeLayout
  bannerHeight={32}
  headerHeight={48}
  footerHeight={24}
  navigationWidth={200}
  navigationPanelWidth={0}
  sidebarWidth={300}
  sidebarPanelWidth={0}
  children={{
    Banner: () => <div>Banner</div>,
    Header: () => <div>Header</div>,
    Navigation: () => <div>Navigation</div>,
    Application: () => <main>App Content</main>,
    Footer: () => <div>Footer</div>,
    Sidebar: () => <div>Sidebar</div>,
  }}
/>
```

See the [Storybook stories](./__stories__/layout.stories.tsx) for more usage examples.
Run using `yarn storybook sharedux` and find "Layout" in the list of stories.
