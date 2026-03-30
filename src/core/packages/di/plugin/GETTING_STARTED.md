# Getting Started With `@kbn/plugin-di`

`@kbn/plugin-di` is the optional authoring layer for Kibana's cross-plugin DI
proof of concept.

Use it when you want one obvious, copy-pasteable pattern for:

- defining cross-plugin service tokens
- defining cross-plugin extension-point tokens
- providing a service
- hosting an extension point
- contributing to an extension point

`@kbn/core-di` still owns the runtime primitives such as `getService(...)`,
`getExtensions(...)`, `injectService(...)`, lifecycle tokens, and decorators.

## The Core Pattern

There are two separate authoring jobs:

- use `createTokenFactory('pluginId')` in a shared types package to define tokens
- use `declare(({ provide, host, contribute, bind }) => ...)` in a plugin module to bind them

That separation is intentional. Tokens should be defined once and imported.
Plugin entrypoints should only bind, host, or contribute existing tokens.

## Define Shared Contracts

Define shared tokens in a small types package that other plugins can import.

```ts
import { createTokenFactory } from '@kbn/plugin-di';

const sloTokens = createTokenFactory('slo');

export interface CreateSLOFlyout {
  (): void;
}

export const SloCreateFlyoutToken =
  sloTokens.service<CreateSLOFlyout>('CreateSLOFlyout');
```

```ts
import { createTokenFactory } from '@kbn/plugin-di';

const embeddableTokens = createTokenFactory('embeddable');

export interface EmbeddableFactoryRegistration {
  type: string;
  getFactory(): Promise<unknown>;
}

export const EmbeddableFactoryRegistrationToken =
  embeddableTokens.extensionPoint<EmbeddableFactoryRegistration>(
    'FactoryRegistration'
  );
```

`createTokenFactory('pluginId')` returns a small scoped helper:

- `.service<T>('Name')`
- `.extensionPoint<T>('Name')`

It automatically prefixes token names with the plugin id, so:

```ts
sloTokens.service('CreateSLOFlyout');
```

becomes:

```ts
Symbol.for('slo.CreateSLOFlyout');
```

Local token names must be PascalCase and must not contain dots.

## Service Or Extension Point?

Choose a **service** when:

- one plugin owns the contract
- consumers should resolve one value

Choose an **extension point** when:

- one plugin owns the collection point
- many plugins may contribute values

## Provide A Service

In the owning plugin:

```ts
import { declare } from '@kbn/plugin-di';
import { MyServiceToken } from '@kbn/my-service-types';
import { MyService } from './my_service';

export const services = declare(({ provide }) => {
  provide(MyServiceToken).to(MyService);
});
```

Common service helpers:

- `provide(token).to(MyServiceClass)`
- `provide(token).toConstantValue(value)`
- `provide(token).from(dep, mapper)`
- `provide(token).fromStart(mapper)`

Use `fromStart(...)` when the service should project from a classic plugin
`start()` contract that the platform auto-bridges into DI.

```ts
import { declare } from '@kbn/plugin-di';
import type { MyPluginStart } from './types';

export const services = declare(({ provide }) => {
  provide(MyServiceToken).fromStart<MyPluginStart>((start) => start.myService);
});
```

## Host An Extension Point

In the host plugin:

```ts
import { getExtensions, OnStart, type Container } from '@kbn/core-di';
import { declare } from '@kbn/plugin-di';
import { EmbeddableFactoryRegistrationToken } from '@kbn/embeddable-factory-types';

export const services = declare(({ bind, host }) => {
  host(EmbeddableFactoryRegistrationToken);

  bind(OnStart).toConstantValue((container: Container) => {
    for (const entry of getExtensions(container, EmbeddableFactoryRegistrationToken)) {
      registerReactEmbeddableFactory(entry.type, entry.getFactory);
    }
  });
});
```

## Contribute To An Extension Point

In a contributor plugin:

```ts
import { declare } from '@kbn/plugin-di';
import { EmbeddableFactoryRegistrationToken } from '@kbn/embeddable-factory-types';

export const services = declare(({ contribute }) => {
  contribute(EmbeddableFactoryRegistrationToken).toConstantValue({
    type: 'image',
    getFactory: async () => getImageEmbeddableFactory(),
  });
});
```

Common contribution helpers:

- `contribute(token).toConstantValue(value)`
- `contribute(token).to(ContributionClass)`
- `contribute(token).from(dep, mapper)`
- `contribute(token).fromStart(mapper)`

## Resolve Contracts From Consumers

Consumers use the runtime APIs from `@kbn/core-di`, not `@kbn/plugin-di`.

```ts
import { getService, injectService } from '@kbn/core-di';

const value = getService(container, MyServiceToken, { optional: true });

class Consumer {
  constructor(@injectService(MyServiceToken) private readonly myService: IMyService) {}
}
```

For extension points:

```ts
import { getExtensions } from '@kbn/core-di';

const contributions = getExtensions(container, EmbeddableFactoryRegistrationToken);
```

In React, use `useService(...)` and `useExtensions(...)` from
`@kbn/core-di-browser`.

## Declare Relationships In `plugin.globals`

The manifest layer remains the source of truth for cross-plugin contract
visibility.

Use:

```bash
node scripts/lint_packages --fix
```

to keep `plugin.globals` aligned with statically visible declarations.

The current rule understands explicit `provide(...)`, `host(...)`,
`contribute(...)`, `getService(...)`, `useService(...)`, and related helper
calls. Highly dynamic or lazy patterns may still require manual manifest
annotation.

## Common Mistakes

- Do not hand-write `Symbol.for(...)` for cross-plugin tokens in new code.
- Do not include dots in the local token name. Use `createTokenFactory('slo').service('MyService')`, not `createTokenFactory('slo').service('slo.MyService')`.
- Do not redefine a token in a plugin entrypoint after exporting it from a shared types package.
- Do not use `requiredPlugins` just to model an optional service lookup.
- Do not collapse services and extension points into one generic abstraction. Their ownership and resolution semantics are different on purpose.

## Examples

The PoC examples on this branch use this authoring pattern directly:

- [Alpha](/Users/clint/Projects/kibana.worktrees/dependency-injection/examples/di_global_alpha) and [Beta](/Users/clint/Projects/kibana.worktrees/dependency-injection/examples/di_global_beta) for bidirectional service resolution
- [embeddable](/Users/clint/Projects/kibana.worktrees/dependency-injection/src/platform/plugins/shared/embeddable/public/index.ts) and its contributors for extension points
- [SLO](/Users/clint/Projects/kibana.worktrees/dependency-injection/x-pack/solutions/observability/plugins/slo/public/index.ts) for `fromStart(...)` service projection
