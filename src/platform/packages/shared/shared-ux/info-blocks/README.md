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

- Designed for small sets, typically up to 6 blocks.
- Responsive column collapse (3 → 2 → 1): blocks lay out in up to 3 columns; when a block would fall below 140px wide, the column count steps down so blocks never shrink past that width (they wrap to more rows).
- Leading spacer: set `hasLeadingSpacer` to fill the rest of the first row (no content) after the first block, so the next block leads a fresh row. It adapts to the live column count — at 2 columns it fills the 1 remaining cell, at 3 columns the 2 remaining cells. The block before the spacer keeps its inline-end divider, and the horizontal row divider stays continuous across the whole container.
- Plain text values (and titles) truncate to a single line with an ellipsis, so a long string never overflows its column. Node values (badges, links, images) manage their own layout — see the "Resource" story for a truncating link with a trailing copy action.
- `compressed` tightens spacing; it is intended to be driven by the flyout header's collapse state. In compressed mode, `hasLeadingSpacer` is ignored and custom value sizes are suppressed so the layout stays dense.

```tsx
import { InfoBlocks } from '@kbn/shared-ux-info-blocks';

<InfoBlocks
  hasLeadingSpacer
  items={[
    { title: 'Risk score', value: '90', size: 'xl' },
    { title: 'Vendor', value: 'Elastic' },
  ]}
/>
```
