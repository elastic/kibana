# External types for Kibana

For now I'm building this from Kibana root:

```
./node_modules/.bin/tsc -p packages/kbn-types
```

It gives tons of build failures that must be cleaned up, but it also builds
declaration files into `./types/packages/kbn-types`, which is specified as
the "main" type file for this package in `./package.json`.

Now external code can use this package, e.g. something like this:

```js
import { KibanaFunctionalPlugin } from 'kbn-types';

export const plugin: KibanaFunctionalPlugin<{}> = function(core) {
  const router = core.http.createAndRegisterRouter('/some-path');
}
```
