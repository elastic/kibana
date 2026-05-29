# @kbn/workflows-execution-engine-core

Stateless core of the workflows execution engine.

This package holds engine logic that is pure but parameterised by runtime
collaborators — the templating engine, condition evaluator, flow-control node
implementations (`if`, `foreach`, `while`, `switch`, `on_failure`,
`timeout_zone`, etc.), loop helpers, and the **collaborator interfaces** the
plugin classes implement.

Unlike its sibling
[`@kbn/workflows-execution-engine-utils`](../kbn-workflows-execution-engine-utils),
this package pulls heavier dependencies:

- [`liquidjs`](https://www.npmjs.com/package/liquidjs) for templating
- [`@kbn/eval-kql`](../kbn-eval-kql) for boolean conditions
- [`@kbn/workflows`](../kbn-workflows) for shared types and the graph schema

Consumers that only need cheap helpers (e.g. trigger-condition matching) should
depend on `-utils` instead.

Subsequent commits in this PR will populate the package; today it is an empty
scaffold.
