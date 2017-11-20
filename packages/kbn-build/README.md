# `kbn-build` — The Kibana build tool

`kbn-build` is a build tool inspired by Lerna, which enables sharing code
between Kibana and Kibana plugins.

To run `kbn-build`, go to Kibana root and run `node scripts/kbn`.

## Why `kbn-build`?

Long-term we want to get rid of Webpack from production. That means third-party
plugins (including x-pack) needs to be able to build themselves separately from
Kibana, and they will therefore no longer be able to `import` files directly
from the Kibana source code.

There are two different types of Kibana dependencies from a plugin perspective:
runtime and static dependencies. The runtime dependencies will be injected into
the plugin at startup, as they are dynamic. However, we also have some static
dependencies in Kibana. `eslint-config-kibana` is one example of this, and it
neeeds to be a separate package because eslint requires it. But we also have
dependencies like `datemath`, `flot`, `eui` and others that we control, that we
want to `import` in plugins instead of injecting. Being able to `import` these
packages greatly improves the developer experiece.

Another reason we need static dependencies is that we're gradually introducing
TypeScript into Kibana, and if we want to work nicely with TypeScript across
plugins we need to be able to statically import dependencies. For example, we
have built an observable lib for Kibana in TypeScript and we need to both expose
the functionality and the TypeScript types to plugins, so other plugins built
with TypeScript can get the types for the lib.

Even though we have multiple packages we don't necessarily want to `npm publish`
them. The ideal solution is being able to work on code locally in the Kibana
repo and have a nice workflow that doesn't require publishing, but where we
still get the value of having "packages" that are available to plugins, without
these plugins having to `import` files directly from the Kibana folder.

> The _technically_ simplest approach is probably to allow plugins to `import`
> the packages directly. However, this allows patterns we don't want, and that
> we're specifically trying to get away from (because users could start
> importing _other_ files too, which would not be intentional). We want a
> stricter api in Kibana, and that goes for both runtime and static
> dependencies.

`kbn-build` is a tool that helps us manage these static dependencies, and it
enables us to use share these packages between Kibana and Kibana plugins. It
also enables these packages to have their own dependencies and their own build
scripts, while still having a nice developer experience.

## How it works

The approach we went for to handle multiple packages in Kibana is relying on
`link:` style dependencies in Yarn. That means we define a dependency's version
using it's relative path instead of a version published to the npm registry,
e.g.

```
"eslint-config-kibana": "link:packages/eslint-config-kibana"
```

And now, when Yarn is installing dependencies it will set up a symlink to this
folder, which means you can now make changes to the `eslint-config-kibana`
package and immediately have it available in Kibana itself.

Relying on `link:` style dependencies means we no longer need to `npm publish`
our Kibana specific packages. It also means that plugin authors no longer need
to worry about the versions of the Kibana packages, as they will always use the
packages from their local Kibana.

## The `kbn` use-cases

### Bootstrapping

When bootstrapping we cross-link (aka symlink) all the packages and install
their dependencies (aka we run `yarn install` in each package). The reason we
want bootstrapping to be responsible for installing dependencies in addition to
just symlinking is that we don't want to jump into every package and manually
install. That way we know when bootstrapping is done that we can start Kibana.

To bootstrap Kibana:

```
node scripts/kbn bootstrap
```

You can specify additional arguments to `yarn`, e.g.

```
node scripts/kbn bootstrap -- --frozen-lockfiles
```

By default, `kbn-build` will bootstrap all packages within Kibana, plus all
Kibana plugins located in `../kibana-extra`. There are several options for
skipping parts of this, e.g. to skip bootstrapping of Kibana plugins:

```
node scripts/kbn bootstrap --skip-kibana-extra
```

For more details, run:

```
node scripts/kbn
```

### Running scripts

Some times you want to run the same script across multiple packages and plugins,
e.g. `build` or `test`. Instead of jumping into each package and running
`yarn build` you can run:

```
node scripts/kbn run build
```

And if needed, you can skip packages in the same way as for bootstrapping, e.g.
`--skip-kibana` and `--skip-kibana-extra`.

## Development

This package is run from Kibana root, using `node scripts/kbn`. This will run
the "pre-built" (aka built and commited to git) version of this tool, which is
located in the `dist/` folder.

If you need to build a new version of this package, run `yarn build` in this
folder.

Even though this file is generated we commit it to Kibana, because it's used
_before_ dependencies are fetched (as this is the tool actually responsible for
fetching dependencies).

## Technical decisions

### Why our own tool?

While exploring the approach to static dependencies we built PoCs using npm 5
(which symlinks packages using [`file:` dependencies][npm5-file]), [Yarn
workspaces][yarn-workspaces], Yarn (using `link:` dependencies), and
[Lerna][lerna].

In the end we decided to build our own tool, based on Yarn and `link:`
dependencies. This gave us the control we wanted, and it fits nicely into our
context (e.g. where publishing to npm isn't necessarily something we want to
do).

### Some notes from this exploration

#### `file:` dependencies in npm<5 and in yarn

When you add a dependency like `"foo": "file:../../kibana/packages/foo"`, both
npm<5 and yarn copies the files into the `node_modules` folder. This means you
can't easily make changes to the plugin while developing. Therefore this is a
no-go.

#### `file:` dependencies in npm5

In npm5 `file:` dependencies changed to symlink instead of copy the files. This
means you can have a nicer workflow while developing packages locally. However,
we hit several bugs when using this feature, and we often had to re-run
`npm install` in packages. This is likely because we used an early version of
the new `file:` dependencies in npm5.

#### `link:` dependencies in Yarn

This is the same feature as `file:` dependencies in npm5. However, we did not
hit any problems with them during our exploration.

#### Yarn workspaces

Enables specifying multiple "workspaces" (aka packages/projects) in
`package.json`. When running `yarn` from the root, Yarn will install all the
dependencies for these workspaces and hoist the dependencies to the root (to
"deduplicate" packages). However:

> Workspaces must be children of the workspace root in term of folder hierarchy.
> You cannot and must not reference a workspace that is located outside of this
> filesystem hierarchy.

So Yarn workspaces requires a shared root, which (at least currently) doesn't
fit Kibana, and it's therefore a no-go for now.

#### Lerna

Lerna is based on symlinking packages (similarly to the [`link`][npm-link]
feature which exists in both npm and Yarn, but it's not directly using that
feature). It's a tool built specifically for managing JavaScript projects with
multiple packages. However, it's primarily built (i.e. optimized) for monorepo
_libraries_, so it's focused on publishing packages and other use-cases that are
not necesserily optimized for our use-cases. It's also not ideal for the setup
we currently have, with one app that "owns everything" and the rest being
packages for that app.

[npm-link]: https://docs.npmjs.com/cli/link
[npm5-file]: https://github.com/npm/npm/pull/15900
[yarn-workspaces]: https://yarnpkg.com/lang/en/docs/workspaces/
[lerna]: https://github.com/lerna/lerna
