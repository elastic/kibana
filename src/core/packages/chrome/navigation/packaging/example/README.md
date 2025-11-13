# OneNavigation Example Application

Test application for `@kbn/one-navigation` package.

## Setup

1. Install Kibana dependencies:
   ```bash
   cd /path/to/kibana/root
   yarn kbn bootstrap
   ```

2. Build the package:
   ```bash
   cd src/core/packages/chrome/navigation/packaging
   ./scripts/build.sh
   ```

## Run

```bash
cd src/core/packages/chrome/navigation/packaging/example
yarn start
```

Opens http://localhost:3000

## Tests

**Functional:**
- Logo, primary items, nested menus, footer items clickable
- Collapsed/expanded states toggle correctly
- Active item highlighting works
- Width management updates layout

**Technical:**
- No console errors or React warnings
- TypeScript types work
- Styles render correctly
- Responsive behavior

**Edge Cases:**
- Window resize
- No active item
- Rapid clicking
