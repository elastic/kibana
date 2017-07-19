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

## `@internal`

There is one gotcha related to these declaration files, which is how TypeScript
handles imports when building them. If TypeScript needs to infer a type, but
this type is not `import`ed already in the file, it will fail.

This problem is described in https://github.com/Microsoft/TypeScript/issues/9944,
and this is a comment from the core team about the problem:
https://github.com/Microsoft/TypeScript/issues/9944#issuecomment-244448079.

There are two ways to fix this problem:

1. Add an explicit type instead of relying on the inferred type. When we do this
   we `import` the type and use it, so it's available to TypeScript when
   emitting declarations. (This means that we some times need to add explicit
   types even if TypeScript is able to infer them — TypeScript doesn't
   automatically add the necessary `import`s for it to be available in the
   declaration files).
2. If the code is not needed in plugins (or if it's "difficult" to add an
   explicit type, e.g. for config files), we can add a `/** @internal */`
   JSDoc annotation to the code. As we've specified the compiler option
   `stripInternal` TypeScript will not emit declarations for these.

For grep-ability, this is the error you'll likely see if hitting this problem:

> has or is using name 'Foo' from external module "./bar" but cannot be named
