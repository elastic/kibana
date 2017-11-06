# External types for Kibana

This package contains external types for Kibana, which enables plugins to use
the types, e.g.:

```ts
import { KibanaFunctionalPlugin } from '@elastic/kbn-types';

export const plugin: KibanaFunctionalPlugin<{}> = function(core) {
  const router = core.http.createAndRegisterRouter('/some-path');
}
```

## Development

During development this package is built separately from the Kibana platform.

First make sure you run `npm install`, then:

```
// to build once:
npm run build

// to watch for changes:
npm start
```

This builds declaration files into `./types/packages/kbn-types`, which
is specified as the "main" type file for this package in `./package.json`.

If you want to play around with an example, see the `./example` folder.

## Exposing types

Every type that should be `import`able must be exported in `./index.ts`.

## Caveats

### `@internal`

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

## Why expose declaration files instead of TypeScript files?

This package builds TypeScript [declaration files][ts-decl] instead of just
including the TypeScript files themselves. There are a couple reasons for this:

- If we shipped `.ts` files packages that depend on `kbn-types` would have to
  use the same compiler options. That means we also need to find a way to share
  that in a sane manner. However, if TypeScript adds the option of using
  [`extends` with a package][tsconfig-extends] it might become easier.
- Tools like ts-loader [does not work nicely][ts-loader-node-modules] with `.ts`
  files in `node_modules`.

[ts-decl]: https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html
[tsconfig-extends]: https://github.com/Microsoft/TypeScript/issues/15984
[ts-loader-node-modules]: https://github.com/TypeStrong/ts-loader/issues/278
