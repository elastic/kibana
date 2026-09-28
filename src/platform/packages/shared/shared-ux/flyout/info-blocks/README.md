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
- The card is a `dl`, each block a `dt`/`dd` inside a single wrapper element, so the title/value association is programmatic rather than visual. A `dl` accepts only one wrapper element around a pair, which is why that wrapper is also the grid cell — `InfoBlock` renders it, and belongs inside a `dl`.
- Responsive column collapse: the widest column count (3 or 4) is the one that leaves at most one empty cell in the last row, based on how many items there are. When a column would fall below `minColumnWidth` (default 140 px), the column count steps down and the blocks wrap to more rows.
- Below two columns' worth of `minColumnWidth`, the blocks stack in one column as wide as the container, so a large `minColumnWidth` never causes horizontal scrolling. Raise it when block content needs more room than the default before truncating.
- `maxColumns` is deprecated in favor of `minColumnWidth`. It still accepts `2`, `3`, `4`, or `'auto'` (the default) to set the widest column count.
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
  minColumnWidth={200}
  items={[
    { title: 'Risk score', value: '90', size: 'xl', color: 'danger' },
    { title: 'Owner', value: 'Platform' },
  ]}
/>
```
