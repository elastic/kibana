# Helpers and utilities for Zod

[Zod](https://zod.dev/) is a schema validation library with static type inference for TypeScript.

Helpers defined in this package:

- Can be used in other packages and plugins to make it easier to define schemas with Zod, such as API schemas.
- Are already used in `packages/kbn-openapi-generator`.
- Are already used in `x-pack/plugins/security_solution`.

When you add some helper code to this package, please make sure that:

- The code is generic and domain-agnostic (doesn't "know" about any domains such as Security or Observability).
- The code is reusable and there are already a few use cases for it. Try to not generalize prematurely.