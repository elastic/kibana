# @kbn/flyout-meta-blocks

`MetaBlocks` renders a compact, responsive row of key-value pairs — the metadata line used beneath a flyout title.

## Usage

```tsx
import { MetaBlocks } from '@kbn/flyout-meta-blocks';

<MetaBlocks
  items={[
    { title: 'Last updated', value: 'Dec 3, 2025' },
    { title: 'Owner', value: 'Platform' },
  ]}
/>
```

## Behavior

-   Pairs flow onto one line and wrap when they no longer fit. The item count is unbounded, though (3) is the designed maximum.
-   Titles and values accept arbitrary `ReactNode`, to allow rich content.
-   String values that outgrow the available space truncate in the middle via `EuiTextTruncate`, so both ends stay readable (`etcd-cspm-co…j-kube-system`). Hovering shows the full value in a tooltip, and selecting/copying yields the full text.
-   `ReactNode` values are not truncated in the middle — they fall back to a trailing ellipsis.
-   An item's optional `id` becomes its React key. Supply it for lists that reorder or shrink, so React does not reuse the wrong pair; without it the array position is the key.
-   An empty `items` array renders nothing.