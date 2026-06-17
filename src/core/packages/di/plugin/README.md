# `@kbn/plugin-di`

Plugin-author ergonomics for Kibana's DI proof of concept.

This package is intentionally small. The one question that decides what you reach for: **who provides the implementation?** Use a **service** when *you* own the implementation and publish it for others to consume; use an **extension point** when you own the contract but invite *other* plugins to supply the implementations you then collect.

The primary authoring pattern is:

- `createTokenFactory('myPlugin')` to define shared cross-plugin tokens in a
  types package (`.service('MyService')` for contracts you own and provide,
  `.extensionPoint('MyExtensionPoint')` for contracts other plugins contribute to)
- `declare(({ provide, host, contribute }) => ...)` in a plugin `services`
  module to provide a service, host an extension point, or contribute to one
  (`bind` is also available for local, non-contract bindings)

This package is optional sugar, not a required abstraction layer. Plain
Inversify `ContainerModule` definitions remain fully supported, and
`@kbn/core-di` continues to expose the runtime-facing resolution helpers and
lifecycle tokens.

Treat this package as PoC-era DX guidance rather than a finalized platform API.

Start with [GETTING_STARTED.md](./GETTING_STARTED.md) for the blessed authoring
path. Follow-on candidate migrations for the PoC live in
[NEXT_CANDIDATES.md](./NEXT_CANDIDATES.md).
