---
navigation_title: "Client performance"
description: "Performance tips for plugin client code."
---

# Client performance

## Lazy load code

_tl;dr_: Load as much code lazily as possible. Everyone loves snappy
applications with a responsive UI and hates spinners. Users deserve the
best experience whether they run Kibana locally or
in the cloud, regardless of their hardware and environment.

There are 2 main aspects of the perceived speed of an application: loading time
and responsiveness to user actions. Kibana loads and bootstraps _all_
the plugins whenever a user lands on any page. It means that
every new application affects the overall _loading performance_, as plugin code is
loaded _eagerly_ to initialize the plugin and provide plugin API to dependent
plugins.

However, it’s usually not necessary that the whole plugin code should be loaded
and initialized at once. The plugin could keep on loading code covering API functionality
on Kibana bootstrap, but load UI related code lazily on-demand, when an
application page or management section is mounted.
Always prefer to import UI root components lazily when possible (such as in `mount`
handlers). Even if their size may seem negligible, they are likely using
some heavy-weight libraries that will also be removed from the initial
plugin bundle, therefore, reducing its size by a significant amount.

```ts
import type { Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
export class MyPlugin implements Plugin<MyPluginSetup> {
  setup(core: CoreSetup, plugins: SetupDeps) {
    core.application.register({
      id: 'app',
      title: 'My app',
      async mount(params: AppMountParameters) {
        const { mountApp } = await import('./app/mount_app');
        return mountApp(await core.getStartServices(), params);
      },
    });
    plugins.management.sections.section.kibana.registerApp({
      id: 'app',
      title: 'My app',
      order: 1,
      async mount(params) {
        const { mountManagementSection } = await import('./app/mount_management_section');
        return mountManagementSection(coreSetup, params);
      },
    });
    return {
      doSomething() {},
    };
  }
}
```

## Understanding plugin bundle size

Kibana Platform plugins are pre-built with `@kbn/optimizer`
and distributed as package artifacts. This means that it is no
longer necessary for us to include the `optimizer` in the
distributable version of Kibana Every plugin artifact contains all
plugin dependencies required to run the plugin, except some
stateful dependencies shared across plugin bundles via
`@kbn/ui-shared-deps-npm` and `@kbn/ui-shared-deps-src`. This means
that plugin artifacts _tend to be larger_ than they were in the
legacy platform. To understand the current size of your plugin
artifact, run `@kbn/optimizer` with:

```bash
node scripts/build_kibana_platform_plugins.js --dist --profile-stats-only --profile-focus=my_plugin
```

and check the output in the `target/public/bundles` directory at the repository root:

```bash
ls -lh target/public/bundles/ target/public/bundles/chunks/
# output
# main entry + runtime, loaded eagerly
... kibana.bundle.js
# async chunks (plugins, heavy vendors, shared code) loaded on demand
... chunks/1a2b3c4d.js
```

All plugins are compiled together in a single unified build. Your plugin's
code lives in the `plugin-my_plugin` chunk plus any shared chunks it
contributes to; the per-plugin `page load bundle size` is reported in
`target/optimizer_bundle_metrics.json`. The rule of thumb is to keep the
eagerly loaded portion as small as possible and to move other parts of your
plugin behind `import()` boundaries so they become separate async chunks. If
you want to investigate what your plugin bundle consists of, run
`@kbn/optimizer` with `--profile-stats-only` (or `--profile`, which also opens
an RsDoctor report) to generate a webpack-compatible
[stats file](https://webpack.js.org/api/stats/) at
`target/public/bundles/stats.json`. Use `--profile-focus` to include
module-level detail for specific plugins:

```bash
node scripts/build_kibana_platform_plugins.js --dist --profile-stats-only --profile-focus=my_plugin
```

Many OSS tools allow you to analyze the generated stats file:

- [An official tool](https://webpack.github.io/analyse/#modules) from
  Webpack authors
- [webpack-visualizer](https://chrisbateman.github.io/webpack-visualizer/)
- [webpack-bundle-analyzer](https://github.com/webpack-contrib/webpack-bundle-analyzer)