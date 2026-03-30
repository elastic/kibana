# `@kbn/plugin-di`

Plugin-author ergonomics for Kibana's DI proof of concept.

This package is intentionally small. The primary authoring pattern is:

- `createTokenFactory('myPlugin')` to define shared cross-plugin tokens in a
  types package
- `.service('MyService')` and `.extensionPoint('MyExtensionPoint')` on that
  factory for cross-plugin contracts
- `declare(({ bind, provide, host, contribute }) => ...)` for authoring a
  plugin `services` module that binds imported tokens

This package is optional sugar, not a required abstraction layer. Plain
Inversify `ContainerModule` definitions remain fully supported, and
`@kbn/core-di` continues to expose the runtime-facing resolution helpers and
lifecycle tokens.

Treat this package as PoC-era DX guidance rather than a finalized platform API.

Start with [GETTING_STARTED.md](./GETTING_STARTED.md) for the blessed authoring
path. Follow-on candidate migrations for the PoC live in
[NEXT_CANDIDATES.md](./NEXT_CANDIDATES.md).
