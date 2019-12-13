Interpreter legacy plugin has been migrated to the New Platform. Use
`expressions` New Platform plugin instead.

In the New Platform:

```ts
class MyPlugin {
  setup(core, { expressions }) {
    expressions.registerFunction(myFunction);
  }
  start(core, { expressions }) {
  }
}
```

In the Legacy Platform:

```ts
import { npSetup, npStart } from 'ui/new_platform';

npSetup.plugins.expressions.registerFunction(myFunction);
```
