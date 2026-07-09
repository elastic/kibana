# @kbn/shared-ux-info-blocks

Presentational "info blocks" card: a responsive row of labeled key attributes, each a fixed-style text title above an arbitrary `ReactNode` value.

## Usage

```tsx
import { InfoBlocks } from '@kbn/shared-ux-info-blocks';

<InfoBlocks
  items={[
    { title: 'Owner', value: 'Platform' },
    { title: 'Latency', value: <EuiHealth color="success">Healthy</EuiHealth> },
  ]}
/>
```

## Behavior

- Renders up to 6 blocks. Passing more than 6 is a consumer bug and is not validated at runtime.
- Responsive column collapse (3 → 2 → 1): blocks lay out in up to 3 columns; when a block would fall below (breakpoint), the column count steps down so blocks never shrink past (the breakpoint) (they wrap to more rows).
- `compressed` tightens spacing; it is intended to be driven by the flyout header's collapse state.
