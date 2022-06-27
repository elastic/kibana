- Start Date: 2021-02-24
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

# Summary

Adopt Bazel, an open-source build and test tool as the build system for Kibana.


# What is Bazel

Bazel is an open-source build and test tool similar to Make, Maven, and Gradle. It uses a human-readable, high-level build language. Bazel supports projects in multiple languages and builds outputs for multiple platforms. Bazel supports large codebases across multiple repositories, and large numbers of users.

Bazel offers the following advantages:

* **High-level build language**. Bazel uses an abstract, human-readable language to describe the build properties of your project at a high semantical level. Unlike other tools, Bazel operates on the concepts of libraries, binaries, scripts, and data sets, shielding you from the complexity of writing individual calls to tools such as compilers and linkers.
* **Bazel is fast and reliable**. Bazel caches all previously done work and tracks changes to both file content and build commands. This way, Bazel knows when something needs to be rebuilt, and rebuilds only that. To further speed up your builds, you can set up your project to build in a highly parallel and incremental fashion.
* **Bazel is multi-platform**. Bazel runs on Linux, macOS, and Windows. Bazel can build binaries and deployable packages for multiple platforms, including desktop, server, and mobile, from the same project.
* **Bazel scales**. Bazel maintains agility while handling builds with 100k+ source files. It works with multiple repositories and user bases in the tens of thousands.
* **Bazel is extensible**. Many languages are supported, and you can extend Bazel to support any other language or framework.

For more information, please refer to the [Bazel website](https://www.bazel.build/).


# Motivation

Kibana has grown substantially over the years and now includes more than 2,100,000 lines of code across 25,000 TypeScript and Javascript files, excluding NPM dependencies. For someone to get Kibana up and running, they rely on five main steps:

### Installation of NPM dependencies

Yarn Package Manager handles the installation of NPM dependencies, and the migration to Bazel will not immediately affect the time this step takes. 

### Building packages

The building of [packages](https://github.com/elastic/kibana/tree/main/packages) happens during the bootstrap process initiated by running `yarn kbn bootstrap` and without any cache takes about a minute. Currently, we maintain a single cache item per package, so drastic changes like switching branches frequently results in the worst-case scenario of no-cache being usable.

### Building TypeScript project references

The size of the project and the amount of TypeScript has created scaling issues, resulting in slow project completion and IDE unresponsiveness. To combat this, we have been migrating plugins to use [project references](https://www.typescriptlang.org/docs/handbook/project-references.html) and pre-build them during bootstrap. Currently, this takes over five minutes to complete.

### Building client-side plugins

The [@kbn/optimizer](https://github.com/elastic/kibana/tree/main/packages/kbn-optimizer) package is responsible for building client-side plugins and is initiated during `yarn start`. Without any cache, it takes between three and four minutes, but is highly dependent on the amount of CPU cores available. The caching works similar to packages and requires a rebuild if any files change. Under the hood, this package is managing a set number of workers to run individual Webpack instances. When we first introduced Webpack back in [June of 2015](https://github.com/elastic/kibana/pull/4335), it was responsible for bundling all client-side code within a single process. As the Kibana project continued to grow over time, this Webpack process continued to impact the developer experience. A common theme to address these issues was through reducing the responsibilities of Webpack by separating [SCSS](https://github.com/elastic/kibana/pull/19643) and [vendor code](https://github.com/elastic/kibana/pull/22618). Knowing we would need to continue to scale, one of the new platform’s core objectives was to be able to build each plugin independently. This work paved the way for what we are proposing here and led to the [creation of @kbn/optimizer](https://github.com/elastic/kibana/pull/53976), which improved performance by separating and parallelizing Webpack builds. 

### Compiling server-side code

While in development, we rely on [@babel/register](https://babel.dev/docs/en/babel-register) to transpile server-side code during runtime. The use of `@babel/register` results in the compile-time cost being paid when the code is run, mostly during startup or when initiating a unit test. When comparing development startup to production, where the code is pre-compiled, we see startup time taking about twice as long even when the Babel cache exists.

---

These steps cost developers more than ten minutes of their time when updating or changing branches. These times will continue to worsen as the project continues to grow. Instead of making small incremental changes as we have done in the past, like improving caching in a single area, we would like to leverage Bazel, where there are already solutions to many of these problems.

One of the primary advantages Bazel provides is that the builds are hermetic, meaning they are dependent only on a known set of inputs to ensure the builds are reproducible and cacheable. To create these assurances, builds utilize a sandbox environment with only the defined dependencies available. This not only allows for aggressive local caching but the use of remote caching as well. If Bazel determines that a package or plugin needs to be re-built and it's not in the local cache, it will check the remote cache and, if found, will persist locally for subsequent builds. Once the project has completely migrated to Bazel, a developer will only build code they have directly modified or is dependent on those changes. In building packages and plugins, the expected cost for most developers will be downloading the builds from the remote cache for anything changed since their last build.

Building TypeScript reference definitions and using `@babel/register` will be negated by using the TypeScript compiler directly instead of using Babel. Currently, we use Babel for code generation and `tsc` for type check and type declaration output. Additionally, the TypeScript implementation in [rules_nodejs](https://bazelbuild.github.io/rules_nodejs/TypeScript.html) for Bazel handles incremental builds, resulting in faster re-builds.

In addition to the benefits of building code, there are also benefits regarding running unit tests. Developers currently need to understand what unit tests to run to validate changes or rely on waiting for CI, which has a long feedback loop. Since Bazel knows the dependency tree, it will only run unit tests for a package or plugin modified or dependent on those modifications. This optimization helps developers and will significantly reduce the amount of work CI needs to do. On CI, unit tests take 35 minutes to complete, where the average single Jest project takes just twenty seconds.

# Detailed design

## Installation and configuration

To avoid adding Bazel as a dependency that developers need to manage, we will be using a project called Bazelisk to provide that resolution, similar to Gradle Wrapper. The bootstrap command will ensure that the `@bazel/bazelisk` package is installed globally. Two files will exist at the root of the repository, `.bazeliskversion` and `.bazelversion`, to define the required versions of those packages, similar to specifying the Node version today.


## Typescript

The [NodeJS](https://bazelbuild.github.io/rules_nodejs/TypeScript.html) rules for Bazel contain two different methods for handling TypeScript; `ts_library` and `ts_project`. We will be using `ts_project`, as it provides a wrapper around `tsc` where `ts_library` is an open-sourced version of the rule used to compile TypeScript at Google. While there are advantages to `ts_library`, it’s very opinionated and hard to migrate an existing project to while also locking us into a specific version of TypeScript. Over time, it’s expected that `ts_project` will catch up to that of `ts_library`. 

Bazel maintains a persistent worker which `ts_project` takes advantage of by keeping the AST in memory and providing incremental updates. This should improve the time it takes for changes to be represented. 

A Bazel [macro](https://docs.bazel.build/versions/master/skylark/macros.html) will be created to centralize the usage of `ts_project`. The macro will, at minimum, accept a TypeScript configuration file, supply the base `tsconfig.js` file as a source and ensure incremental builds are enabled.


## Webpack

A Bazel [macro](https://docs.bazel.build/versions/master/skylark/macros.html) will be created to centralize the usage of Webpack. The macro will, at minimum, accept a configuration file and supply a base `webpack.config.js` file. Currently, all plugins share the same Webpack configuration. Allowing a plugin to provide additional configuration will allow plugins the ability to add loaders without affecting the performance of others.

While running Kibana from source in development, the proxy server will ensure that client-side code for plugins is compiled and available. This is currently handled by the [basePathProxy](https://github.com/elastic/kibana/blob/main/src/core/server/http/base_path_proxy_server.ts), where server restarts and optimizer builds are observed and cause the proxy to pause requests. With Bazel, we will utilize [iBazel](https://github.com/bazelbuild/bazel-watche) to watch for file changes and re-build the plugin targets when necessary. The watcher will emit [events](https://github.com/bazelbuild/bazel-watcher#remote-events) that we will use to block requests and provide feedback to the logs.

While there are a few proofs of concepts for a Webpack 5 Bazel rule, none currently exist which are deemed production-ready. In the meantime, we can use the Webpack CLI directly. One of the main advantages being explored in these rules will be the support for using the Bazel worker to provide incremental builds similar to what `@kbn/optimizer` is doing today.

We are aware there are quite a few alternatives to Webpack, but our plan is to continue using it during the migration. Once all packages have been migrated to Bazel, it will be much easier to test alternatives through changing the targets of a single plugins `BUILD.bazel` file.


### Unit Testing

A Bazel macro will be created to centralize the usage of Jest unit testing. The macro will, at minimum, accept a Jest configuration file, add the [Jest preset](https://github.com/elastic/kibana/blob/main/packages/kbn-test/jest-preset.js) and its dependencies as sources, then use the Jest CLI to execute tests. 

Developers currently use `yarn test:jest` to efficiently run tests in a given directory without remembering the command or path. This command will continue to work as it does today, but will begin running tests through Bazel for packages or plugins which have been migrated.

CI will have an additional job to run `bazel test //…:jest`. This will run unit tests for any package or plugin modified or dependent on modifications since the last successful CI run on that branch.

When migrating a package or plugin using Jest to Bazel, a `jest` target using our macro will be defined in its `BUILD.bazel` file. The project is then excluded from the root `jest.config.js` file to ensure the tests do not needlessly run multiple times. While we could still use Babel for supporting TypeScript in Jest, there would be advantages to utilizing Bazel to handle compiling TypeScript. Not only would developers immediately receive type checking, but those builds would also be shared with anything else using the target, like the Kibana server or Webpack.


## Yarn & Node Version Management

Bazel provides the ability to define the version of Node and Yarn which are used, and once we have fully migrated to Bazel, developers will no longer need to take action when we choose to change versions. The only requirement would be to have a single version of Yarn installed so scripts defined in the `package.json` could be executed.

Example excerpt from `WORKSPACE.bazel`:
```python
node_repositories(
  node_repositories = {
    "14.15.4-darwin_amd64": ("node-v14.15.4-darwin-x64.tar.gz", "node-v14.15.4-darwin-x64", "6b0e19e5c2601ef97510f7eb4f52cc8ee261ba14cb05f31eb1a41a5043b0304e"),
    "14.15.4-linux_arm64": ("node-v14.15.4-linux-arm64.tar.xz", "node-v14.15.4-linux-arm64", "b990bd99679158c3164c55a20c2a6677c3d9e9ffdfa0d4a40afe9c9b5e97a96f"),
    "14.15.4-linux_s390x": ("node-v14.15.4-linux-s390x.tar.xz", "node-v14.15.4-linux-s390x", "29f794d492eccaf0b08e6492f91162447ad95cfefc213fc580a72e29e11501a9"),
    "14.15.4-linux_amd64": ("node-v14.15.4-linux-x64.tar.xz", "node-v14.15.4-linux-x64", "ed01043751f86bb534d8c70b16ab64c956af88fd35a9506b7e4a68f5b8243d8a"),
    "14.15.4-windows_amd64": ("node-v14.15.4-win-x64.zip", "node-v14.15.4-win-x64", "b2a0765240f8fbd3ba90a050b8c87069d81db36c9f3745aff7516e833e4d2ed6"),
  },
  node_version = "14.15.4",
  node_urls = [
    "https://nodejs.org/dist/v{version}/{filename}",
  ],
  yarn_repositories = {
    "1.21.1": ("yarn-v1.21.1.tar.gz", "yarn-v1.21.1", "d1d9f4a0f16f5ed484e814afeb98f39b82d4728c6c8beaafb5abc99c02db6674"),
  },
  yarn_version = "1.21.1",
  yarn_urls = [
    "https://github.com/yarnpkg/yarn/releases/download/v{version}/{filename}",
  ],
  package_json = ["//:package.json"],
)
```

## Target outputs

The Kibana project will contain a new `bazel` directory with symlinks to current builds and logs. This directory is not checked in and is covered by gitignore. More details can be found in the Bazel documentation for [output directory layout](https://docs.bazel.build/versions/master/output_directories.html). Keep in mind we specify a [symlink prefix](https://docs.bazel.build/versions/master/user-manual.html#flag--symlink_prefix) of “bazel” to maintain a single directory.

For most, this change will be welcomed as it has been a common complaint that our targets are scattered throughout the repository making it difficult to search without configuring the ignore list.


## Preserve Symlinks

Bazel outputs are created in a folder relative to the monorepo at `./bazel`. However, that folder is just a compilation of symlinks that Bazel creates pointing to temporary folders on the local disk. During the migration, we will begin referencing packages within the `bazel/bin` directory. Internally, Yarn will handle this by creating another symlink from within the `node_modules` directory to packages. By default, any import will be based on the location of the file and not the location of the symlink. This causes issues with module resolution since the `node_modules` directory populated by other dependencies will not be within the tree. To resolve this, we will use the node flag `--preserve-symlinks` that will patch the require calls and prevent Node from expanding the symlinks into their real path during the module resolution.


## Build Packaging

One of the additional benefits to Bazel is that it is multi-platform. While it runs on Linux, macOS, and Windows, it can build binaries across platforms. 

Bazel provides a [pkg](https://github.com/bazelbuild/rules_pkg/tree/main/pkg) rule providing tar, deb, and rpm support. To facilitate cross-platform tar support in the distributable build, we are currently using tar through Node, which is slow. The pkg tar rule will provide an improvement in performance. For deb and RPM builds, Kibana is currently using a Ruby package called [fpm](https://github.com/jordansissel/fpm) created by a former Elastic employee.

For Docker, we currently create the images during the build using Docker then extract the image as a tar to provide the Release Manager which publishes it to our repository. For ARM, we only create a Docker context which Release Manager uses to create the image on ARM hardware. Bazel has a [docker](https://github.com/bazelbuild/rules_docker) rule, which should allow us to cross-build, and do so without actually using Docker.

The current build is fairly procedural and has little caching where subsequent builds take almost as long as the previous. When working on a step later in the build system, one ultimately ends up commenting out previously completed steps to save time when testing. With Bazel, each target consumes sources or dependencies which could be other targets. Conceivably, we will have a target called release, which is dependent on another target for each of the assets in the distribution (Windows zip, Linux 64-bit tar, Darwin tar, RPM 64-bit, Deb 64-bit, Bed Aarch64, etc). Each one of these assets will then depend on the Kibana core and the rest of the plugins. The entire dependency tree for this will be resolved and rebuilt only when necessary. 


## scripts/*

We decided to use scripts to define and list any command-line utility for the repository. With Bazel, we can still use these entry points, but they will need to consume the code from `bazel/dist` instead of relying on `src/setup_node_env` to provide transpiling using `@babel/register`.

After the entire migration, we should consider using Bazel targets to execute the script, as with it, we can automatically resolve the dependencies and build anything not yet available.


## Remote Cache

As mentioned previously, the remote cache is an essential feature of Bazel and something we plan to utilize.

The Node binary is platform-specific, and because it’s used as an input to build the majority of our targets, we will need to write cache for each platform we support in development. A CI job will build and test all Bazel targets for Linux, macOS, and Windows on merge to a tracked branch. It’s important that this job completes as soon as possible to ensure anyone updating with that branch will have cache available. In the future, we will consider allowing pull request jobs to also write to the cache to minimize this race condition.

We have created a proof of concept using persistent storage on Google Cloud and are currently in a trial with [BuildBuddy](https://www.buildbuddy.io/) which provides not only caching but an event viewer, result store, and remote execution of builds. If we decide to move forward with BuildBuddy, we will most likely use their self-hosted solution where we can provide our own GCP infrastructure.


## Packages Build Outline

Within Bazel, the packages will have new overall rules:
 
* It cannot contain build scripts. Every package build will be written using a Bazel `BUILD.bazel` file
* It cannot have side effects. Every package build should be cacheable and reproducible and can not produce any side effects
* Each package should define three major public target rules in `BUILD.bazel` files: `build`, `jest`, and a js_library target with the same name of the folder where the package is living. 
* In order to output its targets in the most Bazel friendly way, each package will output its target according to the following folder structure: for node targets, it will be `target_server`, for web target it will be `target_web` and for types, it will be `target_types`.


## package.json’s Outline

As a prerequisite for Bazel and for additional benefits outlined in pull-request [#76412](https://github.com/elastic/kibana/issues/76412), the Kibana repository went from using Yarn Workspaces to a single `package.json` defining all dependencies.

One of the benefits Bazel has over Gradle is the support for Node modules. Bazel will manage the dependencies using either the NPM or Yarn Package Manager. When doing this, a `BUILD.bazel` file will be generated for each module allowing for fine-grained control.

# Adoption strategy

The project is broken down into four initial phases, providing improvements along the way.


## Phase I - Infrastructure & Packages

In this phase, we set out to provide the necessary infrastructure outlined previously to begin utilizing Bazel and begin doing so by migrating the current 38 packages.

A `BUILD.bazel` file will be added to the root of each package defining a `build` target. This filegroup target will be what we call during the bootstrap phase to build all packages migrated to Bazel. This target is temporary to maintain similar functionality during our transition. In the future, these procedural build steps will be removed in favor of dependency, tree-driven actions where work will only be done if it’s necessary for the given task like running the Kibana server or executing a unit test.

The `@kbn/pm` package was updated in https://github.com/elastic/kibana/pull/89961 to run the new packages build target, invoked by calling `bazel build //packages:build`, before executing the existing legacy package builds.

The build targets will no longer reside within the package themselves and instead will be within the `bazel/bin` directory. To account for this, any defined dependency will need to be updated to reference the new directory (example: `link:bazel/bin/packages/elastic-datemath`). While also in this transition period, the build will need to copy over the packages from `bazel/bin` into the `node_modules` of the build target.

Example package BUILD.bazel for `packages/elastic-datemath`:

```python
load("@build_bazel_rules_nodejs//:index.bzl", "pkg_npm")
load("@build_bazel_rules_nodejs//internal/js_library:js_library.bzl", "js_library")

SRCS = [
    ".npmignore",
    "index.js",
    "index.d.ts",
    "package.json",
    "readme",
    "tsconfig.json",
]

filegroup(
    name = "src",
    srcs = glob(SRCS),
)

js_library(
    name = "elastic-datemath",
    srcs = [ ":src" ],
    deps = [ "@npm//moment" ],
    package_name = "@elastic/datemath",
    visibility = ["//visibility:public"],
)

alias(
    name = "build",
    actual = "elastic-datemath",
    visibility = ["//visibility:public"],
)
```

If the package has unit tests, they will need to be migrated which will be invoked with `bazel test` as described in the Unit Testing section.


## Phase II - Docs, Developer Experience

Packages were a likely choice for phase 1 for a few reasons; they aren’t often updated and the developer experience is quite lacking making it easy to maintain parity with. In phase 2, we will bring the developer experience of packages to that which developers are accustomed to with plugins. This means re-builds will be automatic when a change occurs as well as giving time to address any developer experience shortcomings which were not foreseen. During this time we will work on overall Bazel documentation as it pertains to the Kibana repository.


## Phase III - Core & Plugins

In this phase, we will be migrating each of the 135 plugins over to being built and unit tested using Bazel. During this time, the legacy systems will stay in place and run in parallel with Bazel. Once all plugins have been migrated, we can decommission the legacy systems.

The `BUILD.bazel` files will look similar to that of packages, there will be a target for `web`, `server`, and `jest`. Just like packages, as the Jest unit tests are migrated, they will need to be removed from the root `jest.config.js` file as described in the Unit Testing section.

Plugins are built in a sandbox, so they will no longer be able to use relative imports from one another. For Typescript, relative imports will be replaced with a path reference to the `bazel/bin`.

Static imports across plugins are a concern that would affect the developer experience due to cascading re-builds. For example, if every plugin has static imports from `src/core`, any changes to `src/core` would cause all those plugins to re-build. There are a few options to address this; the first would be to minimize or eliminate these imports. Most plugins are importing types, so we can also ensure that only type-level changes actually trigger a re-build. Additionally, these types of dependencies could be further broken down into smaller packages to reduce the times further this is necessary. 

```
"compilerOptions": {
    "rootDirs": [
        ".",
        "./bazel/out/host/bin/path/to",
        "./bazel/out/darwin-fastbuild/bin/path/to",
        "./bazel/out/k8-fastbuild/bin/path/to",
        "./bazel/out/x64_windows-fastbuild/bin/path/to",
        "./bazel/out/darwin-dbg/bin/path/to",
        "./bazel/out/k8-dbg/bin/path/to",
        "./bazel/out/x64_windows-dbg/bin/path/to",
    ]
}
```


## Phase IV -  Build Packaging

In this phase, we will be replacing our current build tooling located at `src/dev/build` to use Bazel. A single target of `release` will provide all assets needed by the release manager:

* Windows (zip)
* Linux 64-bit (tar)
* Linux aarch64 (tar)
* RPM 64-bit
* RPM aarch64
* Deb 64-bit
* Deb aarch64
* Darwin 64-bit (tar)
* CentOS 64-bit Docker Image & Context (tar)
* CentOS aarch64 Docker Image & Context (tar)
* UBI Docker Image & Context (tar)
* Ironbank Docker Context (tar)

There are a few rules already available provided by Bazel that should be used. In some cases, like tar, they have been re-implemented to ensure the output is hermetic. `rules_pgk` has `pkg_tar`, `pkg_deb`, `pkg_rpm`, and `pkg_zip` to assist with this. `rules_docker` provides the ability to build containers without depending on Docker to be installed and providing the ability to build for other platforms.

While this phase can begin with phase 1, it can not be completed until all packages and plugins have been migrated.

# Drawbacks

With Bazel, all dependencies need to be defined on each package which can become tedious. However, that is also how Bazel is able to provide the level of cache and performance which it does.

Bazel is substantially different from what people in the Javascript community are accustomed to, so teaching might be difficult. For example, in Javascript when you would like to add support for Typescript, you would probably find a package that adds the support to Jest, Webpack, or Babel. However, in Bazel, it works on inputs and outputs. You could still do what was previously described, but it wouldn’t be efficient. Instead, you would have your Typescript code as an input, which would use the Typescript compiler to output Javascript which would be the input to Webpack or Jest. This way, that compile step would only happen once for each of those paths.

It’s also possible there is something better out there for our use, or as some have suggested splitting up our repository into smaller pieces.


# Alternatives

Gradle is widely used at Elastic, however, it doesn’t have the NodeJS specific support which Bazel has.

There are other alternatives that seem to have been created by past Google employees who wanted something like Blaze which is the internal tool used at Google before they open-sourced Bazel (an anagram of Blaze). Most of these just didn’t have a large enough community or provide the level of caching and scaling we were looking for.


# Adoption strategy

The migration would happen in phases starting with packages, then the build system, then plugins. All steps in the phase can happen gradually and over time.


# How we teach this

There will be a lot to teach here, and we have been iterating on a talk which we would give to the entire Kibana team. The Operations team would be available to assist anyone with questions or assistance with Bazel aspects of the build system.
