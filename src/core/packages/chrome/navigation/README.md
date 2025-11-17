# @kbn/core-chrome-navigation

An adaptive side navigation system built with [Elastic UI](https://eui.elastic.co/). Features responsive design, nested menu structures, and accessibility-first user experience. Exported as a self-contained widget.

| Expanded mode                 | Collapsed mode                 |
| ----------------------------- | ------------------------------ |
| ![image](./assets/expanded_mode.png) | ![image](./assets/collapsed_mode.png) |

## Usage

### Basic setup

```tsx
import { Navigation } from '@kbn/core-chrome-navigation';

const navigationItems = {
  primaryItems: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'dashboardApp',
      href: '/dashboard',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'graphApp',
      href: '/analytics',
      secondaryItems: [
        {
          id: 'overview',
          label: 'Overview',
          href: '/analytics',
        },
        {
          id: 'reports',
          label: 'Reports',
          href: '/analytics/reports',
        },
        {
          id: 'metrics',
          label: 'Metrics',
          href: '/analytics/metrics',
        },
      ],
    },
  ],
  footerItems: [
    {
      id: 'settings',
      label: 'Settings',
      icon: 'gear',
      href: '/settings',
    },
  ],
};

function App() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    setActiveItemId(item.id);
    trackAnalytics(item.id);
  };

  return (
    <div className="app">
      <TopBar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <Navigation
        activeItemId={activeItemId}
        isCollapsed={isCollapsed}
        items={navigationItems}
        logo={{
          label: 'Observability',
          id: 'observability',
          iconType: 'observabilityApp',
          href: '/observability',
        }}
        onItemClick={handleItemClick}
        setWidth={setNavigationWidth}
      />
      <main className="app-content">{/* Your application content */}</main>
    </div>
  );
}
```

### Navigation structure

The navigation is configured by passing the structure to `items` prop. The structure is an array of `MenuItem` objects, where each `MenuItem` can have an optional `sections` array of `Section` objects.

```js
export const navigationItems = {
  primaryItems: [
    // Simple menu item
    {
      id: 'overview',
      label: 'Overview',
      iconType: 'info',
      href: '/overview',
      badgeType: 'techPreview', // for tech preview items
    },
    // Menu item with nested sections
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '/analytics/reports',
      sections: [
        {
          id: 'reports-section',
          label: 'Reports', // omit for unlabeled sections
          items: [
            {
              id: 'analytics', // has the same `id` as the parent item
              label: 'Overview',
              href: '/analytics/reports', // has the same `href` as the parent item
            },
            {
              id: 'sales-report',
              label: 'Sales report',
              href: '/analytics/sales',
              badgeType: 'beta', // for beta items
            },
            {
              id: 'traffic-report',
              label: 'Traffic report',
              href: '/analytics/traffic',
              isExternal: true, // opens in new tab and shows an "external resource" icon
            },
          ],
        },
      ],
    },
  ],
  footerItems: [
    {
      id: 'settings',
      label: 'Settings', // it's required for accessibility purposes
      iconType: 'gear',
      href: '/settings',
    },
  ],
};
```

## Development

1. Install dependencies:

```bash
yarn kbn bootstrap
```

2. Start Storybook:

```bash
yarn storybook shared_ux
```

Open [http://localhost:9001](http://localhost:9001) to view the application.

## Testing

The project includes comprehensive test coverage using Jest and RTL.

Run tests with:

```bash
yarn test:jest src/core/packages/chrome/navigation              # Run all tests
yarn test:jest src/core/packages/chrome/navigation --watch      # Run in watch mode
yarn test:jest src/core/packages/chrome/navigation --coverage   # Generate coverage report
```
