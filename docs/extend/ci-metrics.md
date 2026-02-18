---
mapped_pages:
  - https://www.elastic.co/guide/en/kibana/current/ci-metrics.html
---

# CI Metrics [ci-metrics]

In addition to running our tests, CI collects metrics about the Kibana build. These metrics are sent to an external service to track changes over time, and to provide PR authors insights into the impact of their changes.

* [Metric types](#ci-metric-types)
* [Resolving `page load bundle size` overages](#ci-metric-resolving-overages)
* [Validating `page load bundle size` limits](#ci-metric-validating-limits)

## Metric types [ci-metric-types]

### Bundle size [ci-metric-types-bundle-size-metrics]

These metrics track the impact of code changes on Kibana bundle sizes, ensuring optimal loading performance.

$$$ci-metric-page-load-bundle-size$$$ `page load bundle size`
:   The size of the entry file produced for each bundle/plugin. This file is always loaded on every page load, so it should be as small as possible. To reduce this metric you can put any code that isn’t necessary on every page load behind an [`async import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import#Dynamic_Imports).

    Code that is shared statically with other plugins will contribute to the `page load bundle size` of that plugin. This includes exports from the `public/index.ts` file and any file referenced by the `extraPublicDirs` manifest property.


$$$ci-metric-async-chunks-size$$$ `async chunks size`
:   Tracks the sum size (in bytes, by plugin/bundle ID) of "async chunks," which are created for files imported via [`async import()`](https://developer.mozilla.org/en-US/Web/JavaScript/Reference/Statements/import#Dynamic_Imports) statements. This metric reflects the amount of code downloaded when accessing all components within a bundle.

$$$ci-metric-misc-asset-size$$$ `miscellaneous assets size`
:   Tracks the sum size (in bytes, by plugin/bundle ID) of assets that are not async or entry chunks, typically images.

$$$ci-metric-bundle-module-count$$$ `@kbn/optimizer bundle module count`
:   The number of separate modules per bundle/plugin. This metric indicates the `@kbn/optimizer` build time for a bundle, highlighting potentially large module imports.


### Distributable size [ci-metric-types-distributable-size]

The Kibana distributable size is crucial, affecting both download and archive extraction times.

There are several metrics that we don’t report on PRs because gzip-compression produces different file sizes even when provided the same input, so this metric would regularly show changes even though PR authors hadn’t made any relevant changes.

All metrics are collected from the `tar.gz` archive produced for the linux platform.

$$$ci-metric-distributable-file-count$$$ `distributable file count`
:   The number of files included in the default distributable.

$$$ci-metric-distributable-size$$$ `distributable size`
:   The size, in bytes, of the default distributable. *(not reported on PRs)*


### Saved Object field counts [ci-metric-types-saved-object-field-counts]

Elasticsearch limits the number of fields in an index to 1000 by default, and we want to avoid raising that limit.

$$$ci-metric-saved-object-field-count$$$ `Saved Objects .kibana field count`
:   The number of saved object fields broken down by saved object type.



## Adding new metrics [ci-metric-adding-new-metrics]

You can report new metrics by using the `CiStatsReporter` class provided by the `@kbn/dev-utils` package. This class is automatically configured on CI and its methods noop when running outside of CI. For more details checkout the [`CiStatsReporter` readme](https://github.com/elastic/kibana/blob/master/packages/kbn-ci-stats-reporter).


## Resolving `page load bundle size` overages [ci-metric-resolving-overages]

To prevent unexpected growth, the `page load asset size` for each plugin is limited. If a PR exceeds this limit, defined in [`limits.yml`](https://github.com/elastic/kibana/blob/master/packages/kbn-optimizer/limits.yml), the PR author must resolve the overage before merging.

In most cases the limit should be high enough that PRs shouldn’t trigger overages, but when they do make sure it’s clear what is causing the overage by trying the following:

1. Run the optimizer locally with the `--profile` flag to produce webpack `stats.json` files for bundles which can be inspected using a number of different online tools. Focus on the chunk named `{{pluginId}}.plugin.js`; the `*.chunk.js` chunks make up the `async chunks size` metric which is currently unlimited and is the main way that we [reduce the size of page load chunks](/extend/plugin-performance.md).

    ```shell
    node scripts/build_kibana_platform_plugins --focus {pluginid} --profile
    # builds and creates {pluginDir}target/public/stats.json files for {pluginId} and any plugin it depends on
    ```

    * Official Webpack tool: [http://webpack.github.io/analyse/](http://webpack.github.io/analyse/)
    * Webpack visualizer: [https://chrisbateman.github.io/webpack-visualizer/](https://chrisbateman.github.io/webpack-visualizer/)

2. You might want to create stats for the upstream branch of your PR as well and then compare them side by side in Webpack visualizer to spot where the size difference is (using two browser tabs).
3. For relatively small changes you might be able to better understand the problem by sticking stats.json files from two different branches into [Beyond Compare](https://www.scootersoftware.com/download.php)
4. If the number of changes in [Beyond Compare](https://www.scootersoftware.com/download.php) are too large, you can reduce the stats.json file down to just a sorted list of module ids using [jq](https://github.com/stedolan/jq):

    ```shell
    jq -r .modules[].id {pluginDir}/target/public/stats.json | sort - > moduleids.txt
    ```

    Produce a moduleids.txt file for both your branch and master and then pop them into Beyond Compare to get a very specific view of what’s new.

5. As a last resort you might want to try comparing the bundle source directly. It’s usually best to do this using the production source so that you’re inspecting the actual change in bytes that CI is seeing. After building the distributable version of your bundle run it through prettier and then dropping it into Beyond Compare along with the chunk from upstream:

    ```shell
    node scripts/build_kibana_platform_plugins --focus {pluginId} --dist
    npm install -g prettier
    prettier -w {pluginDir}/target/public/{pluginId}.plugin.js
    # repeat these steps for upstream and then compare the two {pluginId}.plugin.js files in Beyond Compare
    ```

6. If all else fails reach out to Operations for help.

Once you’ve identified the files which were added to the build you likely just need to stick them behind an async import as described in [Plugin performance](/extend/plugin-performance.md).

In the case that the bundle size is not being bloated by anything obvious, but it’s still larger than the limit, you can raise the limit in your PR. Do this either by editing the [`limits.yml` file](https://github.com/elastic/kibana/blob/master/packages/kbn-optimizer/limits.yml) manually or by running the following to have the limit updated to the current size + 15kb

```shell
node scripts/build_kibana_platform_plugins --focus {pluginId} --update-limits
```

This command has to run the optimizer in distributable mode so it will take a lot longer and spawn one worker for each CPU on your machine.

Changes to the [`limits.yml` file](https://github.com/elastic/kibana/blob/master/packages/kbn-optimizer/limits.yml) will trigger review from the Operations team, who will attempt to verify that the size increase is justified. If you have findings you can share from the steps above that would be very helpful!


## Validating `page load bundle size` limits [ci-metric-validating-limits]

While you’re trying to track down changes which will improve the bundle size, try running the following command locally:

```shell
node scripts/build_kibana_platform_plugins --dist --watch --focus {pluginId}
```

This will build the front-end bundles for your plugin and only the plugins your plugin depends on. Whenever you make changes the bundles are rebuilt and you can inspect the metrics of that build in the `target/public/metrics.json` file within your plugin. This file will be updated as you save changes to the source and should be helpful to determine if your changes are lowering the `page load asset size` enough.

If you only want to run the build once you can run:

```shell
node scripts/build_kibana_platform_plugins --validate-limits --focus {pluginId}
```

This command needs to apply production optimizations to get the right sizes, which means that the optimizer will take significantly longer to run and on most developer machines will consume all of your machines resources for 20 minutes or more. If you’d like to multi-task while this is running you might need to limit the number of workers using the `--max-workers` flag.


