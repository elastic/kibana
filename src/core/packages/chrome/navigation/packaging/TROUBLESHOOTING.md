# Troubleshooting Guide

This guide covers common issues and solutions when using the `@kbn/one-navigation` package in your Elastic application.

## TypeScript Errors

### Problem
`Cannot find module '@kbn/one-navigation'` or type errors

### Solution
Ensure TypeScript can resolve the package:

```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

---

## Styles Not Rendering

### Problem
Navigation appears unstyled or has missing styles

### Solution
Ensure you've wrapped your app with `EuiProvider`:

```tsx
import { EuiProvider } from '@elastic/eui';

<EuiProvider colorMode="light">
  <OneNavigation {...props} />
</EuiProvider>
```

**Note**: The `colorMode` prop can be `"light"` or `"dark"` depending on your application's theme.

---

## Wrong EUI Version

### Problem
Console errors about missing components or props

### Solution
This package requires the same version of `@elastic/eui` that Kibana currently uses. Ensure your application uses a compatible EUI version.

**Version Check:**
- Check Kibana's `package.json` for the current `@elastic/eui` version
- Ensure your application uses the same version
- Version mismatches may cause compatibility issues with component props or styling

**Finding Kibana's EUI version:**
- Check `kibana/package.json` in the Kibana repository
- Look for `@elastic/eui` in the dependencies section

---

## Navigation Overlaps Content

### Problem
Main content is hidden behind the navigation

### Solution
Use the `setWidth` callback to add margin to your main content:

```tsx
function App() {
  const [navigationWidth, setNavigationWidth] = useState(0);

  return (
    <div style={{ display: 'flex' }}>
      <OneNavigation
        // ... other props
        setWidth={setNavigationWidth}
      />
      <main style={{ marginLeft: `${navigationWidth}px` }}>
        {/* Your content */}
      </main>
    </div>
  );
}
```

**Why this happens:**
- The navigation uses `position: fixed` by default
- Without adjusting the main content margin, it will be positioned behind the navigation

---

## Active Item Not Highlighting

### Problem
Clicked items don't show as active

### Solution
Ensure you update `activeItemId` in your `onItemClick` handler:

```tsx
const [activeItemId, setActiveItemId] = useState('dashboard');

const handleItemClick = (item) => {
  setActiveItemId(item.id); // Update active item state
};

<OneNavigation
  activeItemId={activeItemId}
  onItemClick={handleItemClick}
  // ... other props
/>
```

**Common mistakes:**
- Forgetting to update `activeItemId` state
- Using incorrect item IDs (ensure they match your navigation structure)
- Not passing `activeItemId` prop to the component

---

## Component Not Rendering

### Problem
OneNavigation component doesn't appear or throws errors

### Checklist
1. **EuiProvider**: Ensure your app is wrapped with `<EuiProvider>`
2. **React version**: Ensure you're using React 18+
3. **Required props**: Verify all required props are provided:
   - `items` (NavigationStructure)
   - `logo` (SideNavLogo)
   - `activeItemId` (string)
   - `isCollapsed` (boolean)
   - `onItemClick` (function)
   - `setWidth` (function)

### Example minimal setup:
```tsx
import { OneNavigation } from '@kbn/one-navigation';
import { EuiProvider } from '@elastic/eui';

function App() {
  return (
    <EuiProvider colorMode="light">
      <OneNavigation
        items={{ primaryItems: [...], footerItems: [...] }}
        logo={{ id: 'home', label: 'App', iconType: 'logoElastic', href: '/' }}
        activeItemId="dashboard"
        isCollapsed={false}
        onItemClick={(item) => console.log(item)}
        setWidth={(width) => console.log(width)}
      />
    </EuiProvider>
  );
}
```

---

## Console Warnings or Errors

### Problem
React warnings or errors in the browser console

### Common Warnings

**"Each child in a list should have a unique key prop"**
- Ensure all navigation items have unique `id` properties
- Check nested sections and secondary items for duplicate IDs

**"Failed prop type" warnings**
- Verify your navigation structure matches the expected types
- Check that all required fields are present (id, label, iconType for items)

**EUI warnings about themes**
- Ensure `EuiProvider` is properly configured with a valid `colorMode`
- EUI components expect theme context from `EuiProvider`

---

## Navigation Width Not Updating

### Problem
`setWidth` callback not being called or receiving incorrect values

### Solution
Verify your `setWidth` callback is properly defined:

```tsx
const [navigationWidth, setNavigationWidth] = useState(0);

// Correct
<OneNavigation setWidth={setNavigationWidth} />

// Incorrect - inline function may cause issues
<OneNavigation setWidth={(w) => setNavigationWidth(w)} />
```

**Note**: The `setWidth` callback is called whenever the navigation width changes (e.g., when toggling collapsed state). The width value is in pixels.

---

## Nested Navigation Not Expanding

### Problem
Clicking items with `sections` doesn't show secondary menu

### Solution
Ensure your navigation structure includes `sections` array:

```tsx
const navigationItems = {
  primaryItems: [
    {
      id: 'analytics',
      label: 'Analytics',
      iconType: 'graphApp',
      href: '#/analytics',
      sections: [  // ← sections array is required
        {
          id: 'reports-section',
          label: 'Reports',
          items: [
            { id: 'overview', label: 'Overview', href: '#/analytics' },
            { id: 'sales', label: 'Sales', href: '#/analytics/sales' },
          ],
        },
      ],
    },
  ],
};
```

**Requirements for nested navigation:**
- Primary item must have `sections` array
- Each section must have `items` array
- Section label is optional (for unlabeled sections)

---

## Build or Import Errors

### Problem
Module resolution errors or build failures

### Solution

**Check your build configuration:**
1. Ensure your bundler supports ES modules
2. Verify `node_modules` resolution is correct
3. Check for conflicting dependencies

**Common build issues:**
- **Webpack**: Ensure proper module resolution rules
- **TypeScript**: Verify `moduleResolution` is set to `"node"` or `"bundler"`
- **Babel**: Ensure preset supports ES6+ and JSX

---

## Performance Issues

### Problem
Navigation rendering is slow or janky

### Solutions

1. **Minimize re-renders:**
   ```tsx
   // Use React.memo for your navigation items
   const navigationItems = useMemo(() => ({
     primaryItems: [...],
     footerItems: [...],
   }), []); // Only recreate if dependencies change
   ```

2. **Optimize callbacks:**
   ```tsx
   // Use useCallback for event handlers
   const handleItemClick = useCallback((item) => {
     setActiveItemId(item.id);
   }, []);
   ```

3. **Reduce navigation complexity:**
   - Limit nested sections to 2-3 levels
   - Avoid excessive number of items (>20 primary items)
   - Consider pagination or search for large menus

---

## Need More Help?

If you're still experiencing issues:

1. **Check the example app**: See [example/README.md](./example/README.md) for a complete working implementation
2. **Review the main README**: See [README.md](./README.md) for API documentation and usage examples
3. **Contact the Shared UX team**: 
   - Slack: #kibana-shared-ux (for Elastic employees)
   - GitHub Issues: [Report a bug](https://github.com/elastic/kibana/issues)
   - GitHub Discussions: [Ask a question](https://github.com/elastic/kibana/discussions)

---

## Known Issues

### Current Limitations

1. **i18n**: Internal UI strings are English only
   - See [I18N.md](./I18N.md) for details
   - Full translation support available as a future enhancement on-demand

2. **Bundle size optimization**: While the package is minified (~26 KB), further optimizations may be possible
   - Tree-shaking requires proper ES module support in your bundler
   - Source maps are included by default (can be excluded for smaller bundles)

---

**Last Updated**: Initial release  
**Package Version**: 1.0.0  
**Compatible with**: Same version of @elastic/eui that Kibana uses, React 18+

