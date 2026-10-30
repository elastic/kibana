# @kbn/ebt-tools

Shared tools for event based telemetry.

## Entry points

- `@kbn/ebt-tools`: React-free helpers (performance metric events, performance tracker). Safe to import from both server and browser code.
- `@kbn/ebt-tools/react`: `PerformanceContextProvider`, `usePerformanceContext`, `usePageReady` and friends. Browser-only; importing it from server code pulls React into the server bundle.
