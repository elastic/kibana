# Typescript
Although this is not a requirement, we encourage if all new code is developed in [Typescript](https://www.typescriptlang.org/).

- [Project references](#project-references)
  - [Caveats](#caveats)
  - [Prerequisitions](#prerequisitions)
  - [Implementation](#implementation)

## Project references
Kibana has crossed the 1.5m LoC mark. The current situation creates some scaling problems when the default out-of-the-box setup stops working. As a result, developers suffer from slow project compilation and IDE unresponsiveness. As a part of [Developer Experience project](https://github.com/elastic/kibana/projects/63), we are migrating our tooling to use built-in TypeScript features addressing the scaling problems - [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) & [incremental buils](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#faster-subsequent-builds-with-the---incremental-flag). In a nutshell - instead of compiling the whole Kibana codebase at once, this setup enforces splitting the code base into independent projects that form a directed acyclic graph (DAG) that allows the TypeScript compiler(`tsc`) to apply several advanced optimizations:
- every project emits *public* interfaces in the form of `d.ts` type declaration
- created`d.ts` type declarations are used whenever a referenced project is imported in a depending project
- it makes it possible to determine which project needs rebuilding when the source code has changed to use a more aggressive caching strategy.
More details are available in the [official docs](https://www.typescriptlang.org/docs/handbook/project-references.html)

### Caveats
This architecture imposes several limitations to which we must comply:
- projects cannot have circular dependencies. Even though the Kibana platform doesn't support circular dependencies between Kibana plugins, TypeScript does allow circular type imports between files. So in theory, you might face a problem when migrating to the TS project references so you will have to remove this circular dependency.
- a project must emit its type declaration. It's not always possible to generate a type declaration if the compiler cannot reference a type. There are two basic cases:
1. Your plugin exports a type inferring an internal type declared in Kibana codebase. In this case, you'll have to either export an internal type or to declare an exported type explicitly.
2. Your plugin exports something inferring a type from a 3rd party library that doesn't export this type. To fix the problem, you have to declare the exported type manually.

### Prerequisitions
Since `tsc` doesn't support circular references, the migration order does matter. You can migrate your plugin only when all the plugin dependencies already have migrated. It creates the situation when low-level plugins (such as `data` or `kibana_react`) have to migrate first.

### Implementation
- make sure all the plugins listed as dependencies in `kibana.json` file have migrated to TS project references.
- add `tsconfig.json` in the root folder of your plugin.
```json
{
  "extends": "../../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./target/types",
    "emitDeclarationOnly": true,
    "declaration": true,
    "declarationMap": true
  },
  "include": [
    // add all the folders containg files to be compiled
  ],
  "references": [
    { "path": "../../core/tsconfig.json" },
    // add references to other TypeScript projects your plugin dependes on
  ]
}
```
If your plugin imports a file not listed in `include`, the build will fail with the next message `File ‘…’ is not listed within the file list of project …’. Projects must list all files or use an 'include' pattern.`
- build you plugin `./node_modules/.bin/tsc -b src/plugins/my_plugin`. Fix errors if `tsc` cannot generate type declarations for your project.
- make sure the `target/types` folder doesn’t contain files not belonging to your project. Otherwise, it means your plugin includes files from another project by mistake.
- add your project reference to `include` property of `tsconfig.refs.json`
- add your plugin to `include` property and plugin folder to `exclude` property of the `tsconfig.json` it used to belong to (for example, for `src/plugins/**` it's `tsconfig.json`; for `x-pack/plugins/**` it’s `x-pack/tsconfig.json`).
- list the reference to your newly created project in all the Kibana `tsconfig.json` files that could import your project: `tsconfig.json`, `test/tsconfig.json`, `x-pack/tsconfig.json`, `x-pack/test/tsconfig.json`. And in all the plugin-specific `tsconfig.refs.json` for dependent plugins.
 - you can measure how your changes affect `tsc` compiler performance with `node --max-old-space-size=4096 ./node_modules/.bin/tsc -p tsconfig.json --extendedDiagnostics --noEmit`. Compare with **master** branch.
