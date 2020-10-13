# @kbn/optimizer

`@kbn/optimizer` is a package for building Kibana platform UI plugins (and hopefully more soon).

Kibana Platform plugins with `"ui": true` in their `kibana.json` file will have their `public/index.ts` file (and all of its dependencies) bundled into the `target/public` directory of the plugin. The build output does not need to be updated when other plugins are updated and is included in the distributable without requiring that we ship `@kbn/optimizer` 🎉.

## Webpack config

The [Webpack config][WebpackConfig] is designed to provide the majority of what was available in the legacy optimizer and is the same for all plugins to promote consistency and keep things sane for the operations team. It has support for JS/TS built with babel, url imports of image and font files, and support for importing `scss` and `css` files. SCSS is pre-processed by [postcss][PostCss], built for both light and dark mode and injected automatically into the page when the parent module is loaded (page reloads are still required for switching between light/dark mode). CSS is injected into the DOM as it is written on disk when the parent module is loaded (no postcss support).

Source maps are enabled except when building the distributable. They show the code actually being executed by the browser to strike a balance between debuggability and performance. They are not configurable at this time but will be configurable once we have a developer configuration solution that doesn't rely on the server (see [#55656](https://github.com/elastic/kibana/issues/55656)).

### Browser Support

To make front-end code easier to debug the optimizer uses the `BROWSERSLIST_ENV=dev` environment variable (by default) to build JS and CSS that is compatible with modern browsers. In order to support all browsers that we support with the distributable you will need to specify the `BROWSERSLIST_ENV=production` environment variable or build a distributable for testing.

## Running the optimizer

The `@kbn/optimizer` is automatically executed from the dev cli, the Kibana build scripts, and in CI. If you're running Kibana locally in some other way you might need to build the plugins manually, which you can do by running `node scripts/build_kibana_platform_plugins` (pass `--help` for options).

### Worker count

You can limit the number of workers the optimizer uses by setting the `KBN_OPTIMIZER_MAX_WORKERS` environment variable. You might want to do this if your system struggles to keep up while the optimizer is getting started and building all plugins as fast as possible. Setting `KBN_OPTIMIZER_MAX_WORKERS=1` will cause the optimizer to take the longest amount of time but will have the smallest impact on other components of your system.

We only limit the number of workers we will start at any given time. If we start more workers later we will limit the number of workers we start at that time by the maximum, but we don't take into account the number of workers already started because it is assumed that those workers are doing very little work. This greatly simplifies the logic as we don't ever have to reallocate workers and provides the best performance in most cases.

### Caching

Bundles built by the the optimizer include a cache file which describes the information needed to determine if the bundle needs to be rebuilt when the optimizer is restarted. Caching is enabled by default and is very aggressive about invalidating the cache output, but if you need to disable caching you can pass `--no-cache` to `node scripts/build_kibana_platform_plugins`, or set the `KBN_OPTIMIZER_NO_CACHE` environment variable to anything (env overrides everything).

When a bundle is determined to be up-to-date a worker is not started for the bundle. If running the optimizer with the `--dev/--watch` flag, then all the files referenced by cached bundles are watched for changes. Once a change is detected in any of the files referenced by the built bundle a worker is started. If a file is changed that is referenced by several bundles then workers will be started for each bundle, combining workers together to respect the worker limit.

## Bundle Refs

In order to dramatically reduce the size of our bundles, and the time it takes to build them, bundles will "ref" other bundles being built at the same time. When the optimizer starts it creates a list of "refs" that could be had from the list of bundles being built. Each worker uses that list to determine which import statements in a bundle should be replaced with a runtime reference to the output of another bundle.

At runtime the bundles share a set of entry points via the `__kbnBundles__` global. By default a plugin shares `public` so that other code can use relative imports to access that directory. To expose additional directories they must be listed in the plugin's kibana.json "extraPublicDirs" field. The directories listed there will **also** be exported from the plugins bundle so that any other plugin can import that directory. "common" is commonly in the list of "extraPublicDirs".

> NOTE: We plan to replace the `extraPublicDirs` functionality soon with better mechanisms for statically sharing code between bundles.

When a directory is listed in the "extraPublicDirs" it will always be included in the bundle so that other plugins have access to it. The worker building the bundle has no way of knowing whether another plugin is using the directory, so be careful of adding test code or unnecessary directories to that list.

Any import in a bundle which resolves into another bundles "context" directory, ie `src/plugins/*`, must map explicitly to a "public dir" exported by that plugin. If the resolved import is not in the list of public dirs an error will be thrown and the optimizer will fail to build that bundle until the error is fixed.

## Themes

SASS imports in bundles are automatically converted to CSS for one or more themes. In development we build the `v7light` and `v7dark` themes by default to improve build performance. When producing distributable bundles the default shifts to `*` so that the distributable bundles will include all themes, preventing the bundles from needing to be rebuilt when users change the active theme in Kibana's advanced settings.

To customize the themes that are built for development you can specify the `KBN_OPTIMIZER_THEMES` environment variable to one or more theme tags, or use `*` to build styles for all themes. Unfortunately building more than one theme significantly impacts build performance, so try to be strategic about which themes you build.

Currently supported theme tags: `v7light`, `v7dark`, `v8light`, `v8dark`

Examples:
```sh
# start Kibana with only a single theme
KBN_OPTIMIZER_THEMES=v7light yarn start

# start Kibana with dark themes for version 7 and 8
KBN_OPTIMIZER_THEMES=v7dark,v8dark yarn start

# start Kibana with all the themes
KBN_OPTIMIZER_THEMES=* yarn start
```

## API

To run the optimizer from code, you can import the [`OptimizerConfig`][OptimizerConfig] class and [`runOptimizer`][Optimizer] function. Create an [`OptimizerConfig`][OptimizerConfig] instance by calling it's static `create()` method with some options, then pass it to the [`runOptimizer`][Optimizer] function. `runOptimizer()` returns an observable of update objects, which are summaries of the optimizer state plus an optional `event` property which describes the internal events occuring and may be of use. You can use the [`logOptimizerState()`][LogOptimizerState] helper to write the relevant bits of state to a tooling log or checkout it's implementation to see how the internal events like [`WorkerStdio`][ObserveWorker] and [`WorkerStarted`][ObserveWorker] are used.

Example:
```ts
import { runOptimizer, OptimizerConfig, logOptimizerState } from '@kbn/optimizer';
import { REPO_ROOT } from '@kbn/utils';
import { ToolingLog } from '@kbn/dev-utils';

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

await lastValueFrom(
  runOptimizer(config).pipe(logOptimizerState(log, config))
);
```

This is essentially what we're doing in [`script/build_kibana_platform_plugins`][Cli] and the new [build system task][BuildTask].

## Internals

The optimizer runs webpack instances in worker processes. Each worker is configured via a [`WorkerConfig`][WorkerConfig] object and an array of [`Bundle`][Bundle] objects which are JSON serialized and passed to the worker as it's arguments.

Plugins/bundles are assigned to workers based on the number of modules historically seen in each bundle in an effort to evenly distribute the load across the worker pool (see [`assignBundlesToWorkers`][AssignBundlesToWorkers]).

The number of workers that will be started at any time is automatically chosen by dividing the number of cores available by 3 (minimum of 2).

The [`WorkerConfig`][WorkerConfig] includes the location of the repo (it might be one of many builds, or the main repo), wether we are running in watch mode, wether we are building a distributable, and other global config items.

The [`Bundle`][Bundle] objects which include the details necessary to create a webpack config for a specific plugin's bundle (created using [`webpack.config.ts`][WebpackConfig]).

Each worker communicates state back to the main process by sending [`WorkerMsg`][WorkerMsg] and [`CompilerMsg`][CompilerMsg] objects using IPC.

The Optimizer captures all of these messages and produces a stream of update objects.

Optimizer phases:
<dl>
  <dt><code>'initializing'</code></dt>
  <dd>Initial phase, during this state the optimizer is validating caches and determining which builds should be built initially.</dd>
  <dt><code>'initialized'</code></dt>
  <dd>Emitted by the optimizer once it's don't initializing its internal state and determined which bundles are going to be built initially.</dd>
  <dt><code>'running'</code></dt>
  <dd>Emitted when any worker is in a running state. To determine which compilers are running, look for <code>BundleState</code> objects with type <code>'running'</code>.</dd>
  <dt><code>'issue'</code></dt>
  <dd>Emitted when all workers are done running and any compiler completed with a <code>'compiler issue'</code> status. Compiler issues include things like "unable to resolve module" or syntax errors in the source modules and can be fixed by users when running in watch mode.</dd>
  <dt><code>'success'</code></dt>
  <dd>Emitted when all workers are done running and all compilers completed with <code>'compiler success'</code>.</dd>
  <dt><code>'reallocating'</code></dt>
  <dd>Emitted when the files referenced by a cached bundle have changed, before the worker has been started up to update that bundle.</dd>
</dl>

Workers have several error message they may emit which indicate unrecoverable errors. When any of those messages are received the stream will error and the workers will be torn down.

For an example of how to handle these states checkout the [`logOptimizerState()`][LogOptimizerState] helper.

[PostCss]: https://postcss.org/
[Cli]: src/cli.ts
[Optimizer]: src/optimizer.ts
[ObserveWorker]: src/observe_worker.ts
[CompilerMsg]: src/common/compiler_messages.ts
[WorkerMsg]: src/common/worker_messages.ts
[Bundle]: src/common/bundle.ts
[WebpackConfig]: src/worker/webpack.config.ts
[BundleDefinition]: src/common/bundle_definition.ts
[WorkerConfig]: src/common/worker_config.ts
[OptimizerConfig]: src/optimizer_config.ts
[LogOptimizerState]: src/log_optimizer_state.ts
[AssignBundlesToWorkers]: src/assign_bundles_to_workers.ts
[BuildTask]: ../../src/dev/build/tasks/build_kibana_platform_plugins.js