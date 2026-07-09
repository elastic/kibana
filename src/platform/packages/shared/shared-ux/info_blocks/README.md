# @kbn/shared-ux-info-blocks

Presentational "info blocks" card: a responsive row of labeled key attributes, each a fixed-style text title above an arbitrary `ReactNode` value.

Reusable on its own (e.g. the body of the Observability SLO list flyout) and consumed by the flyout content template's header, where the header owns the collapsed (`compressed`) state.

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
- Responsive column collapse (3 → 2 → 1): blocks lay out in up to 3 columns; when a block would fall below 140px wide, the column count steps down so blocks never shrink past ~140px (they wrap to more rows).
- Does not stick to the top on scroll.
- `compressed` tightens spacing; it is intended to be driven by the flyout header's collapse state.
