# @kbn/shared-ux-flyout-info-blocks

Presentational "info blocks" card: a responsive row of labeled key attributes, each a fixed-style text title above an arbitrary `ReactNode` value.

## Usage

```tsx
import { InfoBlocks } from '@kbn/shared-ux-flyout-info-blocks';

<InfoBlocks
  items={[
    { title: 'Owner', value: 'Platform' },
    { title: 'Latency', value: <EuiHealth color="success">Healthy</EuiHealth> },
  ]}
/>
```

## Behavior

- Designed for small sets, typically up to 8 blocks.
- Responsive column collapse: blocks lay out in up to `maxColumns` columns (default 3); when a block would fall below 140 px wide, the column count steps down so blocks never shrink past that width (they wrap to more rows).
- `maxColumns` can be `2`, `3`, `4`, or `'auto'`. `'auto'` picks the widest column count (3 or 4) that leaves at most one empty cell in the last row, based on how many items there are.
- Plain text values (and titles) truncate to a single line with an ellipsis, so a long string never overflows its column. Node values (badges, links, images) manage their own layout.
- Each `InfoBlockItem` accepts an optional `size` (EUI font-scale key, e.g. `'xl'`) to enlarge a single value, and an optional `color` (EUI text color token, e.g. `'danger'`) to tint it.

```tsx
import { InfoBlocks } from '@kbn/shared-ux-flyout-info-blocks';

<InfoBlocks
  maxColumns="auto"
  items={[
    { title: 'Risk score', value: '90', size: 'xl', color: 'danger' },
    { title: 'Owner', value: 'Platform' },
  ]}
/>
```
