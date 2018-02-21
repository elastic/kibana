# Kibana-related packages

This folder contains packages that are intended for use in Kibana and Kibana
plugins.

tl;dr:

- Don't publish to npm registry
- Always use the `@kbn` namespace
- Always set `"private": true` in `package.json`

## Using these packages

We no longer publish these packages to the npm registry. Now, instead of
specifying a version when including these packages, we rely on `link:`
dependencies in Yarn, which sets up a symlink to the package.

For example if you want to use the `@kbn/datemath` package in Kibana itself, you
can specify the dependency like this:

```
"@kbn/datemath": "link:packages/kbn-datemath"
```

However, if you want to use this from a Kibana plugin, you need to account for
the relative location of the Kibana repo, so it would instead be:

```
"@kbn/datemath": "link:../../kibana/packages/kbn-datemath"
```

How all of this works is described in more detail in the
[`@kbn/pm` docs](./kbn-pm#how-it-works).

## Creating a new package

Create a new sub-folder. The name of the folder should mirror the `name` in the
package's `package.json`. E.g. if the name is `@kbn/datemath` the folder name
should be `kbn-datemath`.

All new packages should use the `@kbn` namespace, and should be marked with
`"private": true`.

