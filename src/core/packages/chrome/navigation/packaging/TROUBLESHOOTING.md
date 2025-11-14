# Troubleshooting

Common issues when using `@kbn/one-navigation`.

## TypeScript: Cannot Find Module

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

## Styles Not Rendering

Wrap your app with `EuiProvider`:

```tsx
import { EuiProvider } from '@elastic/eui';

<EuiProvider colorMode="light">
  <OneNavigation {...props} />
</EuiProvider>
```

## Wrong EUI Version

Use the same `@elastic/eui` version as Kibana. Check `kibana/package.json` for the current version.

## Navigation Overlaps Content

Use `setWidth` callback to add margin:

```tsx
const [navWidth, setNavWidth] = useState(0);

<OneNavigation setWidth={setNavWidth} />
<main style={{ marginLeft: `${navWidth}px` }}>
  {/* content */}
</main>
```

## Active Item Not Highlighting

Update `activeItemId` in `onItemClick`:

```tsx
const [activeItemId, setActiveItemId] = useState('dashboard');

<OneNavigation
  activeItemId={activeItemId}
  onItemClick={(item) => setActiveItemId(item.id)}
/>
```

## Component Not Rendering

**Required props:**
- `items` (NavigationStructure)
- `logo` (SideNavLogo)
- `activeItemId` (string)
- `isCollapsed` (boolean)
- `onItemClick` (function)
- `setWidth` (function)

**Requirements:**
- Wrap with `<EuiProvider>`
- React 18+

## Console Warnings

**Unique key warnings:** Ensure all items have unique `id` properties

**Failed prop type:** Verify structure matches expected types (check `id`, `label`, `iconType`)

**EUI theme warnings:** Ensure `EuiProvider` has valid `colorMode`

## Nested Menu Not Expanding

Primary item needs `sections` array:

```tsx
{
  id: 'analytics',
  label: 'Analytics',
  iconType: 'graphApp',
  href: '#/analytics',
  sections: [
    {
      id: 'section-1',
      label: 'Reports',
      items: [...]
    }
  ]
}
```

## Performance Issues

1. Memoize navigation items with `useMemo`
2. Use `useCallback` for event handlers
3. Limit nested sections and total items

## Need Help?

- **Example app**: [example/README.md](./example/README.md)
- **Slack**: #appex-sharedux
- **GitHub**: [Kibana Issues](https://github.com/elastic/kibana/issues)
