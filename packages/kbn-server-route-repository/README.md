# @kbn/server-route-repository

Utility functions for creating a typed server route repository, and a typed client, generating runtime validation and type validation from the same route definition.

## Usage

TBD

## Server vs. Browser entry points

This package can only be used on the server. The browser utilities can be found in `@kbn/server-route-repository-utils`.

When adding utilities to this package, please make sure to update the entry points accordingly and the [BUILD.bazel](./BUILD.bazel)'s `target_web` target build to include all the necessary files.
