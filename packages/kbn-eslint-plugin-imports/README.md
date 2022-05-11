# @kbn/eslint-plugin-imports

ESLint plugin providing custom rules for validating imports in the Kibana repo with custom logic beyond what's possible with custom config to eslint-plugin-imports and even a custom resolver.

For the purposes of this ESLint plugin "imports" include:

 - `import` statements
 - `import()` expressions
 - `export ... from` statements
 - `require()` calls
 - `require.resolve()` calls
 - `jest.mock()` and related calls

An "import request" is the string defining the target package/module by any of the previous mentioned "import" types

## `@kbn/imports/no_unresolvable_imports`

This rule validates that every import request in the repository can be resolved by `@kbn/import-resolver`.

This rule is not configurable, should never be skipped, and is auto-fixable.

If a valid import request can't be resolved for some reason please reach out to Kibana Operations to work on either a different strategy for the import or help updating the resolve to support the new import strategy.

## `@kbn/imports/uniform_imports`

This rule validates that every import request in the repsitory follows a standard set of formatting rules. See the rule implemeation for a full breakdown but here is a breif summary:

 - imports within a single package must use relative paths
 - imports across packages must reference the other package using it's module id
 - imports to code not in a package must use relative paths
 - imports to an `index` file end with the directory name, ie `/index` or `/index.{ext}` are stripped
 - unless this is a `require.resolve()`, the imports should not mention file extensions. `require.resolve()` calls will retain the extension if added manually

This rule is not configurable, should never be skipped, and is auto-fixable.

## `@kbn/imports/exports_moved_packages`

This rule assists package authors who are doing the good work of breaking up large packages. The goal is to define exports which used to be part of one package as having moved to another package. The configuration maintains this mapping and is designed to be extended in the future is additional needs arrise like targetting specific package types.

Config example:
```ts
'@kbn/imports/exports_moved_packages': ['error', [
  {
    fromPackage: '@kbn/kitchen-sink',
    toPackage: '@kbn/spatula',
    exportNames: [
      'Spatula',
      'isSpatula'
    ]
  }
]]
```

This config will find any import of `@kbn/kitchen-sink` which specifically references the `Spatula` or `isSpatula` exports, remove the old exports from the import (potentially removing the entire import), and add a new import after the previous following it's style pointing to the new package.

The auto-fixer here covers the vast majority of import styles in the repository but might not cover everything, including `import * as Namespace from '@kbn/kitchen-sink'`. Imports like this will need to be found and updated manually, though TypeScript should be able to find the vast majority of those.