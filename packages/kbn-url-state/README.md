# @kbn/url-state - utils for syncing state to URL

This package provides:

- a React hook called `useSyncToUrl` that can be used to synchronize state to the URL. This can be useful when you want to make a portion of state shareable.

## useSyncToUrl

The `useSyncToUrl` hook takes three arguments:

```
key (string): The key to use in the URL to store the state.
restore (function): A function that is called with the deserialized value from the URL. You should use this function to update your state based on the value from the URL.
cleanupOnHistoryNavigation (optional boolean, default: true): If true, the hook will clear the URL state when the user navigates using the browser's history API.
```

### Example usage:

```
import React, { useState } from 'react';
import { useSyncToUrl } from '@kbn/url-state';

function MyComponent() {
  const [count, setCount] = useState(0);

  useSyncToUrl('count', (value) => {
    setCount(value);
  });

  const handleClick = () => {
    setCount((prevCount) => prevCount + 1);
  };

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={handleClick}>Increment</button>
    </div>
  );
}
```

In this example, the count state is synced to the URL using the `useSyncToUrl` hook.
Whenever the count state changes, the hook will update the URL with the new value.
When the user copies the updated url or refreshes the page, `restore` function will be called to update the count state.