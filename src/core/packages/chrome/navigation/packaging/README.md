# @kbn/one-navigation

Standalone side navigation component for Elastic products built outside of Kibana. Provides Kibana's navigation UI without Kibana runtime dependencies.

## Overview

Repackaged from Kibana's production navigation component for use across Elastic's product portfolio. Built with [Elastic UI](https://eui.elastic.co/).

**For:** Elastic product teams building React 18+ applications outside of Kibana  
**Not for:** Kibana itself (use `@kbn/core-chrome-navigation` instead)

**Features:**
- No Kibana dependencies required
- ~26 KB minified bundle size
- WCAG compliant accessibility
- Built-in Emotion styling (no separate CSS)
- Responsive across viewports
- English UI strings (i18n available on demand)

### Basic Example

```tsx
import React, { useState } from 'react';
import { OneNavigation } from '@kbn/one-navigation';
import { EuiProvider } from '@elastic/eui';
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/one-navigation';

function App() {
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

  // Define your navigation structure
  const navigationItems = {
    primaryItems: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        iconType: 'dashboardApp',
        href: '#/dashboard',
      },
      {
        id: 'analytics',
        label: 'Analytics',
        iconType: 'graphApp',
        href: '#/analytics',
        sections: [
          {
            id: 'reports-section',
            label: 'Reports',
            items: [
              {
                id: 'analytics-overview',
                label: 'Overview',
                href: '#/analytics',
              },
              {
                id: 'sales-report',
                label: 'Sales Report',
                href: '#/analytics/sales',
              },
            ],
          },
        ],
      },
    ],
    footerItems: [
      {
        id: 'settings',
        label: 'Settings',
        iconType: 'gear',
        href: '#/settings',
      },
    ],
  };

  const logo = {
    id: 'home',
    label: 'My Application',
    iconType: 'logoElastic',
    href: '#/',
  };

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    console.log('Navigation item clicked:', item);
    setActiveItemId(item.id);
  };

  return (
    <EuiProvider colorMode="light">
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <OneNavigation
          items={navigationItems}
          logo={logo}
          isCollapsed={isCollapsed}
          activeItemId={activeItemId}
          onItemClick={handleItemClick}
          setWidth={setNavigationWidth}
        />
        
        <main
          id="app-content"
          role="main"
          style={{
            flex: 1,
            padding: '24px',
            marginLeft: `${navigationWidth}px`,
            transition: 'margin-left 0.3s ease',
          }}
        >
          <h1>My Application</h1>
          <p>Current page: {activeItemId}</p>
          <button onClick={() => setIsCollapsed(!isCollapsed)}>
            Toggle Navigation
          </button>
        </main>
      </div>
    </EuiProvider>
  );
}

export default App;
```

## Documentation

| Document | Description |
|----------|-------------|
| [API Reference](./API_REFERENCE.md) | Props, types, and usage examples |
| [Build Guide](./BUILD.md) | Building from source |
| [Troubleshooting](./TROUBLESHOOTING.md) | Common issues and solutions |
| [i18n Guide](./I18N.md) | Multi-language support |
| [Example App](./example/README.md) | Test application |

## Future Enhancements

Prioritized based on Elastic product team needs. Contact Shared UX (#appex-sharedux) to discuss:

- **Multi-language support**: Translation for UI strings (en, fr-FR, ja-JP, zh-CN, de-DE, etc.)
- **Shared build infrastructure**: Reusable tooling for packaging other Kibana components

## Contributing

Maintained by Shared UX and EUI teams. For Elastic team members:

1. Follow [Kibana contributing guidelines](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md)
2. Maintain backward compatibility
3. Run tests: `yarn test:jest src/core/packages/chrome/navigation`
4. Coordinate with Shared UX for breaking changes

## Support

- **Slack**: #appex-sharedux
- **GitHub**: [Kibana Issues](https://github.com/elastic/kibana/issues)
