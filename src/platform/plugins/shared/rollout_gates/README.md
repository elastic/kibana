# `@kbn/rollout-gates-plugin`

Proof of concept: a generic, server-side answer to one question — *"is this build the one
that introduced capability X, or has a later build already shipped it?"* — for any plugin
that ships a capability in two phases to stay rollback-safe on Serverless.

See [`docs/rollout_gates.md`](./docs/rollout_gates.md) for terms, rules and known
limitations.
