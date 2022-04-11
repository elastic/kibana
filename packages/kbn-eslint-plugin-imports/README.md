# @kbn/eslint-plugin-imports

ESLint plugin providing custom rules for validating imports in the Kibana repo with custom logic beyond what's possible with custom config to eslint-plugin-imports and even a custom resolver

## `resolveKibanaImport(request: string, dirname: string)`

Resolve an import request (the "from" string from an import statement, or any other relative/absolute import path) from a given directory. The `dirname` should be the same for all files in a given directory.

Result will be `null` when the import path does not resolve, but all valid/committed import paths *should* resolve. Other result values are documented in src/resolve_result.ts.