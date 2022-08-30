# @kbn/server-route-repository

Utility functions for creating a typed server route repository, and a typed client, generating runtime validation and type validation from the same route definition.

## Usage

TBD

## Server vs. Browser entry points

This package exposes utils that can be used on both: the server and the browser.
However, importing the package might bring in server-only code, affecting the bundle size.
To avoid this, the package exposes 2 entry points: [`index.js`](./src/index.ts) and [`web_index.js`](./src/web_index.ts).

When adding utilities to this package, please make sure to update the entry points accordingly and the [BUILD.bazel](./BUILD.bazel)'s `target_web` target build to include all the necessary files.
