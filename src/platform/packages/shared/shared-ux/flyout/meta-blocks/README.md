# @kbn/shared-ux-flyout-meta-blocks

`MetaBlocks` renders a compact, responsive row of key-value pairs — the metadata line used beneath a flyout title.

## Usage

```tsx
import { MetaBlocks } from '@kbn/shared-ux-flyout-meta-blocks';

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
-   An empty `items` array renders nothing.