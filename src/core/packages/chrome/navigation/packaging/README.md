# @kbn/one-navigation

> **Standalone Elastic Navigation component for non-Kibana Elastic applications**

A self-contained, production-ready side navigation component built with [Elastic UI](https://eui.elastic.co/). This package is designed for **Elastic teams building products outside of Kibana** and provides a consistent navigation UI without requiring Kibana runtime dependencies.

## What is OneNavigation?

OneNavigation is Kibana's battle-tested navigation component, repackaged as a standalone library for use across Elastic's product portfolio. It enables non-Kibana products to leverage the same navigation UI that powers Kibana, without pulling in Kibana's infrastructure dependencies.

**Key Benefits:**
- **Visual consistency** across Elastic products
- **Battle-tested** component used in production by Kibana
- **Zero infrastructure** - no Kibana services required
- **Lightweight** - only ~26 KB minified
- **Accessibility** - WCAG compliant, keyboard navigation, screen reader support

## Features

- **Zero Kibana Dependencies** - No Kibana infrastructure required - perfect for standalone Elastic products
- **Small Bundle Size** - Only ~26 KB minified (production build) - minimal impact on your product's bundle
- **Emotion Styling** - Built-in CSS-in-JS styling aligned with EUI - no separate CSS imports needed
- **Accessibility First** - WCAG compliant, keyboard navigation, screen reader support - same standards as Kibana
- **Responsive Design** - Adaptive layout tested across mobile, tablet, and desktop viewports
- **Customizable** - Flexible layout constants and styling options for your product's needs
- **Performance Optimized** - Tree-shakeable, minimal peer dependencies, production-ready
- **English UI** - Internal UI strings in English - multi-language support available as a future enhancement

## Target Audience

This package is specifically designed for:

- **Elastic product teams** building applications outside of Kibana
- **Non-Kibana Elastic services** that need consistent navigation UI
- **Internal React applications** (React 18+) that want to align with Elastic's design system

**NOT for use within Kibana itself** - Kibana should continue importing from `@kbn/core-chrome-navigation` directly.

**Benefits for Elastic teams:**
- Consistent navigation experience across Elastic products
- Reduced development time (pre-built, production-ready component)
- Aligned with Elastic's design system and accessibility standards
- Minimal bundle overhead (~26 KB minified)

## Quick Start

### Why Use OneNavigation?

This package enables Elastic product teams to:
- **Maintain consistency** across Elastic's product portfolio
- **Reduce development time** with a battle-tested navigation component
- **Stay aligned** with Elastic's design system and accessibility standards
- **Avoid Kibana dependencies** while still leveraging Kibana's navigation expertise

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
| [API Reference](./API_REFERENCE.md) | Complete API documentation, props, types, and advanced usage |
| [Internationalization Guide](./I18N.md) | i18n considerations and multi-language support |
| [Troubleshooting Guide](./TROUBLESHOOTING.md) | Common problems and solutions |
| [Build Guide](./BUILD.md) | Building the package from source |
| [Roadmap](./ROADMAP.md) | Implementation roadmap and future plans |
| [Roadmap Progress](./ROADMAP_PROGRESS.md) | Detailed progress tracking and decisions |
| [Example Application](./example/README.md) | Complete test application with verification checklist |
| [Elastic UI Documentation](https://eui.elastic.co/) | Official EUI component library documentation |

## Bundle Size

The production build is optimized for size:

- **Production (minified)**: 25.8 KB (26 KB)
- **Development (unminified)**: ~92 KB
- **Source maps**: Included for debugging

Peer dependencies are **externalized** (not bundled):
- `@elastic/eui` (~1.5 MB)
- `@emotion/react` (~70 KB)
- `react` + `react-dom` (~135 KB)

This means the total size depends on your existing dependencies. If you're already using React and EUI, the overhead is minimal.

## Roadmap

### Current Release - **Available Now**
- Standalone build for non-Kibana Elastic applications
- Core navigation features (collapsed/expanded, nested menus, active state)
- Bundle size optimization (~26 KB minified)
- Production-ready for internal Elastic products
- Internal UI strings in English (no-op i18n)

### Future Considerations

**Shared Build Infrastructure**
- Reusable tooling for packaging other Kibana components
- Simplified build configuration for future packages
- Benefits other Elastic teams looking to reuse Kibana components

**Multi-Language Support** (on-demand)
- Full translation support for internal UI strings
- Multiple language support (en, fr-FR, ja-JP, zh-CN, de-DE, etc.)
- Translation extraction and loading
- Backward compatible with current implementation
- **Will be implemented based on demand from Elastic product teams**

**Note**: Future enhancements will be prioritized based on feedback and requirements from Elastic product teams. Contact the Shared UX team to discuss your needs.

## Contributing

This package is maintained by the Shared UX and EUI teams as part of the Kibana monorepo. For Elastic team members:

1. Follow the [Kibana contributing guidelines](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md)
2. Changes to the Navigation component should maintain backward compatibility
3. Run tests before submitting: `yarn test:jest src/core/packages/chrome/navigation`
4. Coordinate with the Shared UX team for breaking changes or major updates
5. Update documentation when adding new features or changing APIs

## Support

- **GitHub Issues**: [Kibana Issues](https://github.com/elastic/kibana/issues) - Report bugs or request features
- **Discussions**: [Kibana Discussions](https://github.com/elastic/kibana/discussions) - Ask questions or share feedback
- **Slack**: Reach out to the Shared UX team (#appex-sharedux) for urgent support or integration questions
- **Documentation**: See the [Documentation](#documentation) section above for comprehensive guides and references
