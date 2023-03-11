# Kibana-related packages

This folder contains packages that are intended for use in Kibana and Kibana
plugins.

tl;dr:

- Don't publish to npm registry
- Always use the `@kbn` namespace
- Always set `"private": true` in `package.json`

## Using these packages

We no longer publish these packages to the npm registry. Now, instead of
specifying a version when including these packages, we rely on yarn workspaces,
which sets up a symlink to the package.

For example if you want to use the `@kbn/i18n` package in Kibana itself, you
can specify the dependency like this:

```
"@kbn/i18n": "1.0.0"
```

However, if you want to use this from a Kibana plugin, you need to use a `link:`
dependency and account for the relative location of the Kibana repo, so it would
instead be:

```
"@kbn/i18n": "link:../../kibana/packages/kbn-i18n"
```

then run `yarn kbn bootstrap` from the plugin directory.

## Creating a new package

Run the following command from the root of the Kibana repo:

```
node scripts/generate package @kbn/<PACKAGE_NAME> --web --owner @elastic/<TEAM_NAME>
```


## Unit tests for a package

Currently there is only one tool being used in order to test packages which is Jest. Below we will explain how it should be done.

### Jest
A package should follow the pattern of having `.test.js` files as siblings of the source code files, and these run by Jest.

A package using the `.test.js` naming convention will have those tests automatically picked up by Jest and run by the unit test runner, currently mapped to the Kibana `test` script in the root `package.json`.

* `yarn test` runs all unit tests.
* `yarn jest` runs all Jest tests in Kibana.

In order for the plugin or package to use Jest, a jest.config.js file must be present in it's root. However, there are safeguards for this in CI should a test file be added without a corresponding config file.

----
Each package can also specify its own `test` script in the package's `package.json`, for cases where you'd prefer to run the tests from the local package directory.
