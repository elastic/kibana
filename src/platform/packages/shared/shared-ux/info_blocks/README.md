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
- Responsive column collapse (3 → 2 → 1): blocks lay out in up to 3 columns; when a block would fall below 140px wide, the column count steps down so blocks never shrink past that width (they wrap to more rows).
- Leading spacer: include the exported `LEADING_SPACER` sentinel in `items` to fill the rest of the current row (no content) so the following block leads a fresh row. It adapts to the live column count — at 2 columns it fills the 1 remaining cell, at 3 columns the 2 remaining cells. The block before the spacer keeps its right-hand divider, and the horizontal row divider stays continuous across the whole container.
- Plain text values (and titles) truncate to a single line with an ellipsis, so a long string never overflows its column. Node values (badges, links, images) manage their own layout — see the "Resource" story for a truncating link with a trailing copy action.
- `compressed` tightens spacing; it is intended to be driven by the flyout header's collapse state.

```tsx
import { InfoBlocks, LEADING_SPACER } from '@kbn/shared-ux-info-blocks';

<InfoBlocks
  items={[
    { title: 'Risk score', value: '90', size: 'xl' },
    LEADING_SPACER,
    { title: 'Vendor', value: 'Elastic' },
  ]}
/>
```
