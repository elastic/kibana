# @kbn/flyout-info-blocks

Presentational "info blocks" card: a responsive row of labeled key attributes, each a fixed-style text title above an arbitrary `ReactNode` value.

## Usage

```tsx
import { InfoBlocks } from '@kbn/flyout-info-blocks';

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
- Plain text values truncate to a single line in the middle via `EuiTextTruncate`, so both ends stay readable. Node values (badges, links, images) manage their own layout.
- Each `InfoBlockItem` accepts an optional `size` (EUI font-scale key, e.g. `'xl'`) to enlarge a single value, and an optional `color` (EUI text color token, e.g. `'danger'`) to tint it.
- An item's optional `id` becomes its React key. Supply it for lists that reorder or shrink, so React does not reuse the wrong cell; without it the array position is the key.

## Test subjects

- `infoBlocks` on the container, overridable with `data-test-subj`.
- `infoBlock` on each block, overridable per item with `data-test-subj`.
- `infoBlockValue` on a plain text value's truncation wrapper. Node values render as given, so they carry no subject of their own.

```tsx
import { InfoBlocks } from '@kbn/flyout-info-blocks';

<InfoBlocks
  maxColumns="auto"
  items={[
    { title: 'Risk score', value: '90', size: 'xl', color: 'danger' },
    { title: 'Owner', value: 'Platform' },
  ]}
/>
```
