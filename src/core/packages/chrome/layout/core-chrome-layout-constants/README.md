# @kbn/core-chrome-layout-constants

Type-safe CSS variables and constants for Kibana's layout system.

## Quick Usage

```typescript
import { layoutVar } from '@kbn/core-chrome-layout-constants';

const styles = css`
  height: ${layoutVar('header.height')}; // resolves to var(--kbn-layout--header-height)
  width: ${layoutVar('banner.width', '100%')}; // resolves to var(--kbn-layout--banner-width, 100%)
  top: ${layoutVar('application.topBar.top')}; // resolves to var(--kbn-application--top-bar-top)
`;
```

## Available Variables

- **Layout components**: `banner`, `header`, `footer`, `navigation`, `sidebar`, `application`
- **Application components**: `application.topBar`, `application.bottomBar`, `application.content`
- **Properties**: `top`, `bottom`, `left`, `right`, `height`, `width`

## API Reference

See [`@kbn/ui-chrome-layout-constants`](../../../../platform/kbn-ui/chrome-layout-constants) for the implementation and usage examples.

## Related

- [`@kbn/ui-chrome-layout-constants`](../../../../platform/kbn-ui/chrome-layout-constants) - implementation (this package re-exports it)
- [`@kbn/ui-chrome-layout`](../../../../platform/kbn-ui/chrome-layout) - React components using these variables
