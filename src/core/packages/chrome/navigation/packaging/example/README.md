# OneNavigation Example Application

This is a test application to demonstrate and validate the `@kbn/one-navigation` package.

## Setup

This example application uses dependencies from the Kibana root, so there's no need to run `yarn install` separately.

**Note**: You may see IDE errors about missing modules before the first build. This is expected and will resolve after building the package.

1. **Ensure Kibana dependencies are installed:**
   ```bash
   cd /path/to/kibana/root
   yarn kbn bootstrap
   ```

2. **Build the OneNavigation package:**
   ```bash
   cd src/core/packages/chrome/navigation/packaging
   ./scripts/build.sh
   ```
   
   After building, IDE errors for `@kbn/one-navigation` imports should resolve.

## Running the Example

From the example directory:

```bash
yarn start
# or directly:
./start.sh
```

This will start a webpack dev server at http://localhost:3000

**Note**: All dependencies (React, EUI, webpack, etc.) are resolved from the Kibana root's `node_modules` via the `start.sh` script, so there's no need to maintain a separate set of dependencies for this example.

## What This Tests

- ✅ OneNavigation component renders correctly
- ✅ All navigation features work (primary items, nested items, footer items)
- ✅ Collapsed/expanded states
- ✅ Active item highlighting
- ✅ Custom layout constants (`mainContentSelectors`, `mainScrollContainerId`)
- ✅ Width management via `setWidth` callback
- ✅ Click handling via `onItemClick` callback
- ✅ No-op i18n (default English messages)
- ✅ Emotion styling works correctly
- ✅ No Kibana dependencies required

## Verification Checklist

### Functional Tests
- [ ] Navigation renders without errors
- [ ] Logo is clickable
- [ ] Primary items are clickable and update active state
- [ ] Nested items expand/collapse (Analytics, Data)
- [ ] Secondary menu items work
- [ ] Footer items work (Settings)
- [ ] Toggle collapsed/expanded state
- [ ] Collapsed state shows popovers on hover
- [ ] Active item highlights correctly
- [ ] Width callback updates main content margin

### Technical Tests
- [ ] No console errors
- [ ] No React warnings
- [ ] TypeScript types work correctly
- [ ] Bundle loads successfully
- [ ] Styles render correctly
- [ ] Responsive behavior works

### Edge Cases
- [ ] Resize window to test responsive menu
- [ ] Test with no active item
- [ ] Test rapid clicking
- [ ] Test deeply nested navigation

## Bundle Info

- **Size**: ~26 KB (minified)
- **Dependencies**: Externalized (React, EUI, Emotion as peer deps)
- **i18n**: No-op implementation (no translation overhead)

