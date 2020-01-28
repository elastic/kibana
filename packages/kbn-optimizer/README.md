# @kbn/optimizer

`@kbn/optimizer` is a package for building new platform UI plugins (and hopefully more soon).

New Platform plugins with `"ui": true` in their `kibana.json` file will have their `public/index.ts` file (and all of its dependencies) bundled into the `target/public` directory of the plugin. The build output does not need to be updated when other plugins are updated and is included in the distributable without requiring that we ship `@kbn/optimizer` 🎉.

## Webpack config

The [Webpack config][WebpackConfig] is designed to provide the majority of what was available in the legacy optimizer and is the same for all plugins to promote consistency and keep things sane for the operations team. It has support for JS/TS built with babel, url imports of image and font files, and support for importing `scss` and `css` files. SCSS is pre-processed by [postcss][PostCss], built for both light and dark mode and injected automatically into the page when the parent module is loaded (page reloads are still required for switching between light/dark mode). CSS is injected into the DOM as it is written on disk when the parent module is loaded (no postcss support).

Source maps are enabled execpt when building the distributable. They show the code actually being executed by the browser to strike a balance between debuggability and performance. They are not configurable at this time but will be configurable once we have a developer configuration solution that doesn't rely on the server (see [#55656](https://github.com/elastic/kibana/issues/55656)).

### IE Support

To make front-end code easier to debug the optimizer uses the `BROWSERSLIST_ENV=dev` environment variable (by default) to build JS and CSS that is compatible with modern browsers. In order to support older browsers like IE in development you will need to specify the `BROWSERSLIST_ENV=production` environment variable or build a distributable for testing.

## Running the optimizer

The `@kbn/optimizer` is automatically executed from the dev cli, the Kibana build scripts, and in CI. If you're running Kibana locally in some other way you might need to build the plugins manually, which you can do by running `node scripts/build_new_platform_plugins` (pass `--help` for options).

You can limit the number of workers the optimizer uses in all of these places by setting the `KBN_OPTIMIZER_MAX_WORKERS` environment variable. You might want to do this if your system struggles to keep up while the optimizer is getting started and building all plugins as fast as possible. Setting `KBN_OPTIMIZER_MAX_WORKERS=1` will cause the optimizer to take the longest amount of time but will have the smallest impact on other components of your system.

## API

To run the optimizer from code, you can import the [`Optimizer`][Optimizer] and [`OptimizerConfig`][OptimizerConfig] classes. Create an [`OptimizerConfig`][OptimizerConfig] instance by calling it's static `create()` method with some options, then pass it to the [`Optimizer`][Optimizer] constructor. Calling `Optimizer#run()` will return an observable of [`OptimizerState`][Optimizer] objects, which are either bits of stdio from the workers or [`OptimizerStateSummary`][Optimizer] objects. You can use the [`logOptimizerState()`][LogOptimizerState] helper to write the relevant bits of state to a tooling log.

Example:
```ts
import { Optimizer, OptimizerConfig, logOptimizerState } from '@kbn/optimizer';
import { REPO_ROOT, ToolingLog } from '@kbn/dev-utils';

const log = new ToolingLog({
  level: 'verbose',
  writeTo: process.stdout,
})

const config = OptimizerConfig.create({
  repoRoot: Path.resolve(__dirname, '../../..'),
  watch: false,
  oss: true,
  dist: true
});

const optimizer = new Optimizer(config);

await optimizer
  .run()
  .pipe(logOptimizerState(log, config))
  .toPromise();
```

This is essentially what we're doing in [`the build_new_platform_plugins script`][Cli] and the new [build system task][BuildTask].

## Internals

The optimizer runs webpack instances in worker processes. Each worker is configured to build one or more plugins via a [`WorkerConfig`][WorkerConfig] object (created by [`OptimizerConfig`][OptimizerConfig]) which is JSON serialized and passed to the worker as it's only argument.

Plugins/bundles are assigned to workers based on the number of modules historically seen in each bundle in an effort to evenly distribute the load across the worker pool (see [`assignBundlesToWorkers`][AssignBundlesToWorkers]).

The number of workers available is automatically chosen by dividing the number of cores available by 3 (minimum of 2).

The [`WorkerConfig`][WorkerConfig] includes the location of the repo (it might be one of many builds, or the main repo), wether we are running in watch mode, wether we are building a distributable, and a list of [`BundleDefinition`][BundleDefinition] objects which include the details necessary to create a webpack config for a specific plugin's bundle (created using [`webpack.config.ts`][WebpackConfig]).

Each worker communicates state back to the main process by sending [`WorkerMessage`][WorkerMessage] and [`CompilerMessage`][CompilerMessage] objects using IPC.

The Optimizer captures all of these messages and produces a stream of [`OptimizerStateSummary`][Optimizer] and [`WorkerStdio`][ObserveWorker] objects. Workers shouldn't produce any data on their stdio streams, but when they do it's probably because something is wrong so make sure to show them to users somehow. All other messages represent the total state of all workers.

```ts
interface OptimizerStateSummary {
  type: 'running' | 'compiler issue' | 'compiler success';
  durSec: number;
  bundles: BundleState[];
}
```

Optimizer state summary types:
<dl>
  <dt><code>'running'</code></dt>
  <dd>Emitted when any worker is in a running state. To determine which compilers are running, look for <code>BundleState</code> objects with type <code>'running'</code>.</dd>
  <dt><code>'compiler issue'</code></dt>
  <dd>Emitted when all workers are done running and any compiler completed with a <code>'compiler issue'</code> status. Compiler issues include things like "unable to resolve module" or syntax errors in the source modules and can be fixed by users when running in watch mode.</dd>
  <dt><code>'compiler success'</code></dt>
  <dd>Emitted when all workers are done running and all compilers completed with <code>'compiler success'</code>.</dd>
</dl>

Workers have several error message they may emit which indicate unrecoverable errors. When any of those messages are received the stream will error and the workers will be torn down.

For an example of how to handle these states checkout the [`logOptimizerState()`][LogOptimizerState] helper.

[PostCss]: https://postcss.org/
[Cli]: src/cli.ts
[Optimizer]: src/optimizer.ts
[ObserveWorker]: src/observe_worker.ts
[CompilerMessage]: src/common/compiler_messages.ts
[WorkerMessage]: src/common/worker_messages.ts
[WebpackConfig]: src/worker/webpack.config.ts
[BundleDefinition]: src/common/bundle_definition.ts
[WorkerConfig]: src/common/worker_config.ts
[OptimizerConfig]: src/optimizer_config.ts
[LogOptimizerState]: src/log_optimizer_state.ts
[AssignBundlesToWorkers]: src/assign_bundles_to_workers.ts
[BuildTask]: ../../src/dev/build/tasks/build_new_platform_plugins.js