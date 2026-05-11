# @kbn/workflows-execution-engine-utils

Pure, server-side utilities extracted from the
[`workflows_execution_engine`](../../../plugins/shared/workflows_execution_engine)
plugin.

This package is **zero-runtime-dependency**: nothing here imports `@kbn/core`,
plugin contracts, the Elasticsearch client, the task manager, or the actions
plugin. Everything is a pure function or a value object that can be exercised
from a unit test without spinning the engine up.

It exists so adjacent plugins (`workflows_management`, `workflows_extensions`,
future tooling) can reuse engine helpers — most notably trigger-condition
matching and URL validation — without taking a hard dependency on the engine
plugin contract.

Heavier extracted modules (templating engine, flow-control node implementations,
loop helpers) live in the sibling package
[`@kbn/workflows-execution-engine-core`](../kbn-workflows-execution-engine-core),
which pulls `liquidjs` / `@kbn/eval-kql` and the engine's collaborator
interfaces.
