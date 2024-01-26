# @kbn/url-state - utils for syncing state to URL

This package provides a React hook called `useUrlState` that can be used to synchronize state to the URL. This can be useful when you want to make a portion of state shareable.

The state is grouped under a namespace, to avoid collisions. See the example url below for how it would look like.

### Example usage:

```
import React, { useState } from 'react';
import { useUrlState } from '@kbn/url-state';

function MyComponent() {
  const [name, setName] = useUrlState<number>('namespace','name');

  const handleClick = () => {
    setName('John Doe')
  };

  return (
    <div>
      <p>Name: {name}</p>
      <button onClick={handleClick}>Set name</button>
    </div>
  );
}
```

The resulting URL will look like this:

```
http://localhost:5601/?namespace=(name:John%20Doe)
```
