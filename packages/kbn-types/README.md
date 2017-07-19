# External types for Kibana

```
npm install
npm run build
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

If you want to play around with an example, see the `./example` folder.

## Exposing types

Every type that should be directly `import`able must be exported in
`./index.ts`.
