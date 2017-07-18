# External types for Kibana

For now I'm building this from Kibana root:

```
npm run ts:build-start
```

This builds declaration files into `./types/packages/kbn-types`, which is
specified as the "main" type file for this package in `./package.json`.

Now external code can use this package, e.g. something like this:

```js
import { KibanaFunctionalPlugin } from 'kbn-types';

export const plugin: KibanaFunctionalPlugin<{}> = function(core) {
  const router = core.http.createAndRegisterRouter('/some-path');
}
```

## Exposing types

Every type that should be directly `import`able must be exported in
`./index.ts`.
