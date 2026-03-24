# @kbn/react-query

This module wraps the main entrypoints of `@tanstack/react-query`, changing the behavior of `networkMode` to use `'always'` by default.
This allows for async state updates on airgapped environments, where the browser believes there is no network connection (`navigator.onLine: false`).
