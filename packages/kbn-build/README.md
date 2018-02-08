# `kbn-build` — The Kibana build tool

`kbn-build` is a build/monorepo tool inspired by Lerna, which enables sharing
code between Kibana and Kibana plugins.

To run `kbn-build`, go to Kibana root and run `yarn kbn`.

## Why `kbn-build`?

Long-term we want to get rid of Webpack from production (basically, it's causing
a lot of problems, using a lot of memory and adding a lot of complexity).
Ideally we want each plugin to build its own separate production bundles for
both server and UI. To get there all Kibana plugins (including x-pack) need to
be able to build their production bundles separately from Kibana, which means
they need to be able to depend on code from Kibana without `import`-ing random
files directly from the Kibana source code.

From a plugin perspective there are two different types of Kibana dependencies:
runtime and static dependencies. Runtime dependencies are things that are
instantiated at runtime and that are injected into the plugin, for example
config and elasticsearch clients. Static dependencies are those dependencies
that we want to `import`. `eslint-config-kibana` is one example of this, and
it's actually needed because eslint requires it to be a separate package. But we
also have dependencies like `datemath`, `flot`, `eui` and others that we
control, but where we want to `import` them in plugins instead of injecting them
(because injecting them would be painful to work with). (Btw, these examples
aren't necessarily a part of the Kibana repo today, they are just meant as
examples of code that we might at some point want to include in the repo while
having them be `import`able in Kibana plugins like any other npm package)

Another reason we need static dependencies is that we're starting to introduce
TypeScript into Kibana, and to work nicely with TypeScript across plugins we
need to be able to statically import dependencies. We have for example built an
observable library for Kibana in TypeScript and we need to expose both the
functionality and the TypeScript types to plugins (so other plugins built with
TypeScript can depend on the types for the lib).

However, even though we have multiple packages we don't necessarily want to
`npm publish` them. The ideal solution for us is being able to work on code
locally in the Kibana repo and have a nice workflow that doesn't require
publishing, but where we still get the value of having "packages" that are
available to plugins, without these plugins having to import files directly from
the Kibana folder.

Basically, we just want to be able to share "static code" (aka being able to
`import`) between Kibana and Kibana plugins. To get there we need tooling.

`kbn-build` is a tool that helps us manage these static dependencies, and it
enables us to share these packages between Kibana and Kibana plugins. It also
enables these packages to have their own dependencies and their own build
scripts, while still having a nice developer experience.

## How it works

The approach we went for to handle multiple packages in Kibana is relying on
`link:` style dependencies in Yarn. With `link:` dependencies you specify the
relative location to a package instead of a version when adding it to
`package.json`. For example:

```
"eslint-config-kibana": "link:packages/eslint-config-kibana"
```

Now when you run `yarn` it will set up a symlink to this folder instead of
downloading code from the npm registry. That means you can make changes to
eslint-config-kibana and immediately have them available in Kibana itself. No
`npm publish` needed anymore — Kibana will always rely directly on the code
that's in the local packages. And we can also do the same in x-pack-kibana or
any other Kibana plugin, e.g.

```
"eslint-config-kibana": "link:../../kibana/packages/eslint-config-kibana"
```

This works because we moved to a strict location of Kibana plugins,
`../kibana-extra/{pluginName}` relative to Kibana. This is one of the reasons we
wanted to move towards a setup that looks like this:

```
elastic
├── kibana
└── kibana-extra
    ├── kibana-canvas
    └── x-pack-kibana
```

Relying on `link:` style dependencies means we no longer need to `npm publish`
our Kibana specific packages. It also means that plugin authors no longer need
to worry about the versions of the Kibana packages, as they will always use the
packages from their local Kibana.

## The `kbn` use-cases

### Bootstrapping

Now, instead of installing all the dependencies with just running `yarn` you use
the `kbn-build` tool, which can install dependencies (and set up symlinks) in
all the packages using one command (aka "bootstrap" the setup).

To bootstrap Kibana:

```
yarn kbn bootstrap
```

By default, `kbn-build` will bootstrap all packages within Kibana, plus all
Kibana plugins located in `../kibana-extra`. There are several options for
skipping parts of this, e.g. to skip bootstrapping of Kibana plugins:

```
yarn kbn bootstrap --skip-kibana-extra
```

For more details, run:

```
yarn kbn
```

Bootstrapping also calls the `kbn:boostrap` script for every included project.
This is intended for packages that need to be built/transpiled to be usable.

### Running scripts

Some times you want to run the same script across multiple packages and plugins,
e.g. `build` or `test`. Instead of jumping into each package and running
`yarn build` you can run:

```
yarn kbn run build
```

And if needed, you can skip packages in the same way as for bootstrapping, e.g.
`--skip-kibana` and `--skip-kibana-extra`:

```
yarn kbn run build --skip-kibana
```

## Building packages for production

The production build process relies on both the Grunt setup at the root of the
Kibana project and code in `kbn-build`. The full process is described in
`tasks/build/packages.js`.

## Development

This package is run from Kibana root, using `yarn kbn`. This will run the
"pre-built" (aka built and committed to git) version of this tool, which is
located in the `dist/` folder. This will also use the included version of Yarn
instead of using your local install of Yarn.

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
not necessarily optimized for our use-cases. It's also not ideal for the setup
we currently have, with one app that "owns everything" and the rest being
packages for that app.

### Why a local version of Yarn?

See the [vendor readme](./vendor/README.md).

[npm-link]: https://docs.npmjs.com/cli/link
[npm5-file]: https://github.com/npm/npm/pull/15900
[yarn-workspaces]: https://yarnpkg.com/lang/en/docs/workspaces/
[lerna]: https://github.com/lerna/lerna
