# API Reference

Complete API documentation for the `@kbn/one-navigation` component.

## OneNavigation Component

The main component exported by this package. It provides a fully-featured side navigation UI for Elastic applications.

```tsx
import { OneNavigation } from '@kbn/one-navigation';
```

### Props

The `OneNavigation` component accepts the following props (all properties from `NavigationProps`):

#### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `items` | `NavigationStructure` | Navigation structure with `primaryItems` and optional `footerItems` |
| `logo` | `SideNavLogo` | Logo configuration (label, icon, href) |
| `activeItemId` | `string` | ID of the currently active navigation item |
| `isCollapsed` | `boolean` | Whether the navigation is in collapsed state |
| `onItemClick` | `(item: MenuItem \| SecondaryMenuItem \| SideNavLogo) => void` | Callback fired when any navigation item is clicked |
| `setWidth` | `(width: number) => void` | Callback that receives the current navigation width (in pixels) |

#### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sidePanelFooter` | `ReactNode` | `undefined` | Optional footer content for the secondary navigation panel |
| `mainContentSelectors` | `string[]` | `['main', '[role="main"]', '#app-content']` | CSS selectors for the main content area (used for focus management) |
| `mainScrollContainerId` | `string` | `'app-content'` | ID of the main scroll container (used for skip links) |

---

## Type Definitions

### `NavigationStructure`

Defines the overall structure of your navigation.

```typescript
interface NavigationStructure {
  primaryItems: MenuItem[];
  footerItems?: MenuItem[];
}
```

**Fields:**
- `primaryItems` - Array of main navigation items (required)
- `footerItems` - Array of footer navigation items (optional)

**Example:**
```tsx
const navigationStructure: NavigationStructure = {
  primaryItems: [
    { id: 'dashboard', label: 'Dashboard', iconType: 'dashboardApp', href: '#/' },
    { id: 'analytics', label: 'Analytics', iconType: 'graphApp', href: '#/analytics' },
  ],
  footerItems: [
    { id: 'settings', label: 'Settings', iconType: 'gear', href: '#/settings' },
  ],
};
```

---

### `MenuItem`

Represents a navigation item in the primary or footer sections.

```typescript
interface MenuItem {
  id: string;
  label: string;
  iconType: string; // EUI icon name
  href?: string;
  isExternal?: boolean; // Opens in new tab
  badgeType?: BadgeType; // 'beta' | 'techPreview' | 'experimental'
  sections?: SecondaryMenuSection[]; // Nested sections
}
```

**Fields:**
- `id` - Unique identifier for the item (required)
- `label` - Display text for the item (required)
- `iconType` - EUI icon name (required) - see [EUI Icons](https://eui.elastic.co/#/display/icons)
- `href` - URL or hash for the item (optional)
- `isExternal` - If true, opens link in new tab and shows external icon (optional)
- `badgeType` - Badge to display next to label: `'beta'`, `'techPreview'`, or `'experimental'` (optional)
- `sections` - Array of secondary menu sections for nested navigation (optional)

**Example with nested sections:**
```tsx
const analyticsItem: MenuItem = {
  id: 'analytics',
  label: 'Analytics',
  iconType: 'graphApp',
  href: '#/analytics',
  sections: [
    {
      id: 'reports-section',
      label: 'Reports',
      items: [
        { id: 'overview', label: 'Overview', href: '#/analytics/overview' },
        { id: 'sales', label: 'Sales', href: '#/analytics/sales', badgeType: 'beta' },
      ],
    },
  ],
};
```

---

### `SecondaryMenuItem`

Represents a navigation item within a secondary menu (nested under a primary item).

```typescript
interface SecondaryMenuItem {
  id: string;
  label: string;
  href?: string;
  isExternal?: boolean;
  badgeType?: BadgeType;
}
```

**Fields:**
- `id` - Unique identifier for the item (required)
- `label` - Display text for the item (required)
- `href` - URL or hash for the item (optional)
- `isExternal` - If true, opens link in new tab and shows external icon (optional)
- `badgeType` - Badge to display next to label: `'beta'`, `'techPreview'`, or `'experimental'` (optional)

**Note**: Secondary menu items do not have `iconType` or `sections` (they're always nested one level deep).

**Example:**
```tsx
const secondaryItem: SecondaryMenuItem = {
  id: 'sales-report',
  label: 'Sales Report',
  href: '#/analytics/sales',
  badgeType: 'beta',
};
```

---

### `SecondaryMenuSection`

Represents a section grouping within a secondary menu.

```typescript
interface SecondaryMenuSection {
  id: string;
  label?: string; // Optional section label
  items: SecondaryMenuItem[];
}
```

**Fields:**
- `id` - Unique identifier for the section (required)
- `label` - Display text for the section header (optional - omit for unlabeled sections)
- `items` - Array of secondary menu items in this section (required)

**Example with labeled section:**
```tsx
const reportsSection: SecondaryMenuSection = {
  id: 'reports-section',
  label: 'Reports',
  items: [
    { id: 'overview', label: 'Overview', href: '#/analytics/overview' },
    { id: 'sales', label: 'Sales Report', href: '#/analytics/sales' },
  ],
};
```

**Example with unlabeled section:**
```tsx
const unlabeledSection: SecondaryMenuSection = {
  id: 'quick-links',
  // No label - section items will be displayed without a header
  items: [
    { id: 'help', label: 'Help', href: '#/help' },
    { id: 'docs', label: 'Documentation', href: 'https://elastic.co', isExternal: true },
  ],
};
```

---

### `SideNavLogo`

Represents the logo/home link at the top of the navigation.

```typescript
interface SideNavLogo {
  id: string;
  label: string; // Required for accessibility
  iconType: string; // EUI icon name
  href: string;
}
```

**Fields:**
- `id` - Unique identifier (required) - typically `'home'` or similar
- `label` - Accessible label for screen readers (required) - typically your application name
- `iconType` - EUI icon name (required) - typically `'logoElastic'` or your app icon
- `href` - URL or hash for the home page (required)

**Example:**
```tsx
const logo: SideNavLogo = {
  id: 'home',
  label: 'My Elastic Application',
  iconType: 'logoElastic',
  href: '#/',
};
```

**Accessibility Note**: The `label` field is critical for screen readers. Even though the logo may display an icon, the label ensures keyboard and screen reader users know what the link does.

---

### `BadgeType`

Enum-like type for badge variants shown next to navigation items.

```typescript
type BadgeType = 'beta' | 'techPreview' | 'experimental';
```

**Values:**
- `'beta'` - Blue "BETA" badge for features in beta
- `'techPreview'` - Purple "TECH PREVIEW" badge for preview features
- `'experimental'` - Orange "EXPERIMENTAL" badge for experimental features

**Example:**
```tsx
const betaItem: MenuItem = {
  id: 'new-feature',
  label: 'New Feature',
  iconType: 'starFilled',
  href: '#/new-feature',
  badgeType: 'beta', // Shows blue BETA badge
};
```

**Visual appearance:**
- Badges appear next to the item label
- Styled according to EUI badge components
- Visible in both expanded and collapsed states (hover popover in collapsed)

---

## Advanced Usage

### Custom Layout Constants

If your application uses different main content selectors or scroll container IDs, you can customize them:

```tsx
<OneNavigation
  items={navigationItems}
  logo={logo}
  // ... other required props ...
  mainContentSelectors={['main', '#my-app-content']}
  mainScrollContainerId="my-scroll-container"
/>
```

**Why customize these?**
- `mainContentSelectors` - Used for focus management when navigating with keyboard. The navigation will attempt to focus the first matching element when appropriate (e.g., after clicking logo).
- `mainScrollContainerId` - Used for "skip to content" accessibility links. Screen reader users can skip navigation and jump directly to main content.

**Default values:**
- `mainContentSelectors`: `['main', '[role="main"]', '#app-content']`
- `mainScrollContainerId`: `'app-content'`

**Note**: These defaults match Kibana's constants for consistency. Override them if your application uses different selectors.

---

### Nested Navigation Sections

Create multi-level navigation with labeled sections:

```tsx
const navigationItems = {
  primaryItems: [
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '#/analytics',
      sections: [
        {
          id: 'reports-section',
          label: 'Reports', // Section label
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
              badgeType: 'beta', // Show beta badge
            },
          ],
        },
        {
          id: 'metrics-section',
          label: 'Metrics', // Another section
          items: [
            {
              id: 'performance',
              label: 'Performance',
              href: '#/analytics/performance',
            },
          ],
        },
      ],
    },
  ],
  footerItems: [
    {
      id: 'docs',
      label: 'Documentation',
      iconType: 'documentation',
      href: 'https://elastic.co/docs',
      isExternal: true, // Opens in new tab, shows external icon
    },
  ],
};
```

**Best practices for nested navigation:**
- Limit nesting to 2 levels (primary → sections → items) for usability
- Use section labels to organize related items
- Avoid more than 5-7 sections per primary item
- Consider the first secondary item should match the parent's href for "overview" pattern

---

### Managing Width

The navigation dynamically adjusts its width based on collapsed/expanded state. Use the `setWidth` callback to adjust your main content area:

```tsx
function App() {
  const [navigationWidth, setNavigationWidth] = useState(0);

  return (
    <div style={{ display: 'flex' }}>
      <OneNavigation
        // ... props ...
        setWidth={setNavigationWidth}
      />
      <main
        style={{
          marginLeft: `${navigationWidth}px`,
          transition: 'margin-left 0.3s ease', // Smooth animation
        }}
      >
        {/* Your content */}
      </main>
    </div>
  );
}
```

**Width values:**
- **Expanded**: Typically ~248px (may vary slightly based on content)
- **Collapsed**: Typically ~48px
- **Value updates**: The `setWidth` callback is called whenever width changes (e.g., on collapse/expand)

**Transition tip**: Add CSS transition to create smooth animation when toggling collapsed state.

---

### Secondary Panel Footer

Add custom content to the bottom of the secondary navigation panel:

```tsx
<OneNavigation
  // ... other props ...
  sidePanelFooter={
    <div style={{ padding: '16px' }}>
      <EuiButton fullWidth size="s">
        View All Reports
      </EuiButton>
    </div>
  }
/>
```

**Use cases:**
- Call-to-action buttons (e.g., "View All", "Create New")
- Help links or documentation shortcuts
- Status indicators or notifications
- Quick actions related to the current section

**Note**: The footer only appears when a secondary panel is open (i.e., when a primary item with sections is active).

---

## Complete Example

Here's a comprehensive example showing all features:

```tsx
import React, { useState } from 'react';
import { OneNavigation } from '@kbn/one-navigation';
import { EuiProvider, EuiButton } from '@elastic/eui';
import type { MenuItem, SecondaryMenuItem, SideNavLogo } from '@kbn/one-navigation';

function App() {
  const [navigationWidth, setNavigationWidth] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItemId, setActiveItemId] = useState('dashboard');

  const logo: SideNavLogo = {
    id: 'home',
    label: 'My Application',
    iconType: 'logoElastic',
    href: '#/',
  };

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
        badgeType: 'beta' as const,
        sections: [
          {
            id: 'reports-section',
            label: 'Reports',
            items: [
              { id: 'analytics-overview', label: 'Overview', href: '#/analytics' },
              { id: 'sales', label: 'Sales Report', href: '#/analytics/sales' },
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

  const handleItemClick = (item: MenuItem | SecondaryMenuItem | SideNavLogo) => {
    console.log('Clicked:', item);
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
          mainContentSelectors={['main', '[role="main"]']}
          mainScrollContainerId="app-content"
          sidePanelFooter={
            <EuiButton fullWidth size="s">
              View All Reports
            </EuiButton>
          }
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
          <h1>Active page: {activeItemId}</h1>
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

---

## TypeScript Support

The package includes full TypeScript definitions. All types are exported for your use:

```tsx
import type {
  BadgeType,
  MenuItem,
  NavigationProps,
  NavigationStructure,
  SecondaryMenuItem,
  SecondaryMenuSection,
  SideNavLogo,
  OneNavigationProps,
} from '@kbn/one-navigation';
```

**Type safety benefits:**
- IDE autocomplete for props and types
- Compile-time validation of navigation structure
- Inference for callback parameters (e.g., `onItemClick`)

---

## Related Documentation

- **Main README**: [README.md](./README.md) - Overview and quick start
- **Troubleshooting**: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Common issues and solutions
- **Internationalization**: [I18N.md](./I18N.md) - i18n considerations
- **Example App**: [example/README.md](./example/README.md) - Complete working implementation
- **EUI Documentation**: [eui.elastic.co](https://eui.elastic.co/) - Elastic UI component library

---

**Package Version**: 1.0.0  
**Last Updated**: Initial release  
**Maintained by**: Shared UX and EUI teams

