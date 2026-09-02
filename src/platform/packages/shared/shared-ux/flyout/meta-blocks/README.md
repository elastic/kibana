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
-   Text values that outgrow the available space truncate in the middle via `EuiTextTruncate`, so both ends stay readable (`etcd-cspm-co…j-kube-system`). Hovering shows the full value in a tooltip, and selecting/copying yields the full text. Text wrapped in a link truncates the same way, with the link left intact around it.
-   Values that size themselves to their content, such as an `EuiBadge`, keep their own truncation; nesting `EuiTextTruncate` inside a shrink-to-fit box collapses it to zero width.
-   Other `ReactNode` values fall back to a trailing ellipsis.
-   An empty `items` array renders nothing.