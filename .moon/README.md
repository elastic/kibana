# Moon task inputs

The generated `moon.yml` files define a project-specific `src` group from each
project's TypeScript includes. Jest uses the inherited `default` group (`**/*`)
instead. Jest tests can read fixtures and other files directly, regardless of
extension, so an extension allowlist can silently miss an input. The task excludes
root README files and other runners' specs and configs. The upstream task additionally
excludes test files and snapshots, so changes to a project's own tests do not
invalidate its dependents' test tasks. Shared test support, including fixtures,
can affect downstream projects that import it.

Unit Jest composes these inputs:

- `default` for the project's files, including source, tests, fixtures, configs, and assets.
- `jest-tooling:hash` for the shared runner, preset, transforms, and setup files.
- `test-source-upstream` for non-test source in transitive project dependencies.

The Jest config file groups supply config paths to the runners through `@files`.
They are not separate task inputs: their `__fixtures__` exclusion would otherwise
exclude fixture files from the tasks' broad `default` input.
The Jest task separates those config paths from forwarded arguments with `--`.

Place `jest.config.js` at the root of each Moon project that owns unit tests.
`regenerate_moon_projects` tags projects with a Jest config so they inherit
the `jest` task. The existing CI quick check runs `node scripts/check_jest_configs`
and fails when any Jest test is covered by no config or by multiple configs.

Moon's `project://^` input covers direct project dependencies only. The internal
`test-source-upstream` `noop` task recursively follows
`^:test-source-upstream` dependencies so source changes in transitive dependencies
also change the hashes of selected Jest and Scout tasks. Each edge uses
`cacheStrategy: hash` because these tasks have no outputs and Moon otherwise
ignores their hashes. Affected task selection needs `--downstream deep` to include
transitive consumers; the CI queries and PR validation profile request it.

The Jest task excludes `test/functional`, `test/ftr`, Scout specs and configs,
and `.spec` files. Scout support files remain inputs because Jest tests can
import their fixtures.
The broad project input favors correctness over the precision of an extension
allowlist. Jest's resolver mocks ordinary style and image imports, but tests can
also read arbitrary files with Node's filesystem APIs. A co-located test fixture
outside the excluded paths can therefore select its project's Jest task. Narrow
such cases with project-specific inputs only when their ownership is clear.

The synthetic `jest-tooling` project hashes the Jest runner's workspace files
and runtime references that Moon cannot infer from `@kbn/jest`'s project graph.
Its workspace paths must be maintained manually. The tooling project's
exclusions avoid making changes to its own Jest tests and fixtures select every
Jest project.

Add project-specific inputs in `moon.extend.yml`, then run
`node scripts/regenerate_moon_projects.js --update --filter <project-id>`. Keep
runner-specific test files in their runner's task inputs. The project dependency
graph still determines which downstream tasks see a source change; broad packages
may need smaller project boundaries for precise selection.

Jest integration and Scout use one inherited config task per project. Each task's
`@files` argument exposes its config paths in `moon query tasks` output, so CI can
select configs and keep its existing per-config sharding without generated tasks.
The shared selector keeps every Jest unit or integration config in an affected
project. It narrows Scout test-only changes to their owning configs for CI shadow
comparisons. The Jest task runs every config in an affected project when invoked
through `scripts/check.js`. CI currently compares Moon selection with its existing
schedulers. Scout's
`scoutGlobals` group covers its runner and dependency manifests. Integration
and Scout config tasks are no-ops, so they can participate in CI affected queries
without running their test suites.
