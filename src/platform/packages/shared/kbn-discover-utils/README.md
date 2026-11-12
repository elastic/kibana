# @kbn/discover-utils

This is the package contains extracting parts of Discover for the usage in other
unified components. This are mainly shared types, utils and mocks.

## Entry points

- `@kbn/discover-utils`: constants, types and pure utilities. Safe to import from server code;
  it must stay free of EUI and other browser-only libraries.
- `@kbn/discover-utils/components`: React components, hooks and EUI-dependent helpers
  (`ErrorCallout`, `LogLevelBadge`, `usePager`, `formatFieldValueReact`, `getLogLevelColor`, …).
  Browser code only.
