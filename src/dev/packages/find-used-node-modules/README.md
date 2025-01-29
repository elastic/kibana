# @kbn/find-used-node-modules

Simple abstraction over the `@babel/parser` and the `@babel/traverse` to find the node_modules used by a list of files.

## `findUsedNodeModules(resolver, entryPaths): string[]`

Pass an `ImportResolver` instance from `@kbn/import-resolver` and a list of absolute paths to JS files to get the list of `node_modules` used by those files and the files the import.