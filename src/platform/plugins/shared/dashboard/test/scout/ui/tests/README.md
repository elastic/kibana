# Sample data tests

Tests in this directory depend on sample data. They are run by the sequential config
[`../playwright.config.ts`](../playwright.config.ts).

Sample data cannot be installed per space in parallel. The dashboard, map and data view saved
objects are multi-namespace types, so their ids are unique across the whole cluster. If the sample
data is already installed in another space, the importer regenerates the ids of the new copies.
That breaks anything that relies on the fixed sample data ids (legacy urls, short urls, etc.).

To keep the original ids, the tests in this directory run in a single worker against the default
space. Sample data is installed once in `global.setup.ts` and removed in `global.teardown.ts`.
