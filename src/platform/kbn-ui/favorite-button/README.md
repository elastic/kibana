# @kbn/ui-favorite-button

Props-driven favorite (star) button. Usable without Kibana Core.

```tsx
import React from 'react';
import { FavoriteButton } from '@kbn/ui-favorite-button';

const Example = () => {
  return (
    <FavoriteButton
      status="unfavorited"
      onClick={() => undefined}
      addLabel="Add to Starred"
      removeLabel="Remove from Starred"
    />
  );
};
```

CSS hooks `cm-favorite-button`, `cm-favorite-button--empty`, and `cm-favorite-button--active` are part of the rendering contract. Table hover styles depend on them.

Connected favorites (saved-object toggling) stay in `@kbn/content-management-favorites-public`.
