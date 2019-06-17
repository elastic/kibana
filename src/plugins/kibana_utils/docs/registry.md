# Registries

Registry is basically a key-value store for your runtime objects. Some use cases:

- A way for plugins to extend capabilities of another plugin.
- Non-serializable state that you cannot keep in `Store` or Redux.


Create a new registry.

```ts
import { createRegistry } from 'kibana-utils';

const registry = createRegistry<{ id: string, fn: Function }>();
```

Write read by ID.

```ts
registry.set('visualization', visualizationFunction);
registry.get('visualization');
```

Pick items from registry by other fields.

```ts
registry.find(({ name }) => name === 'Johny');
registry.filter(({ name }) => name === 'Johny');
```

Get an array of all registry entries.

```ts
[...registry]
```

Or, only records.

```ts
[...registry.records()]
```
