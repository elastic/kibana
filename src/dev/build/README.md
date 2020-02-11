# dev/build

Build the default and OSS distributables of Kibana.

# Quick Start

```sh

# checkout the help for this script
node scripts/build --help

# build a release version
node scripts/build --release

# reuse already downloaded node executables, turn on debug logging, and only build the default distributable
node scripts/build --skip-node-download --debug --no-oss
```

# Structure

The majority of this logic is extracted from the grunt build that has existed forever, and is designed to maintain the general structure grunt provides including tasks and config. The [build_distributables.js] file defines which tasks are run.

**Task**: [tasks/\*] define individual parts of the build. Each task is an object with a `run()` method, a `description` property, and optionally a `global` property. They are executed with the runner either once (if they are global) or once for each build. Non-global/local tasks are called once for each build, meaning they will be called twice be default, once for the OSS build and once for the default build and receive a build object as the third argument to `run()` which can be used to determine paths and properties for that build.

**Config**: [lib/config.js] defines the config used to execute tasks. It is mostly used to determine absolute paths to specific locations, and to get access to the Platforms.

**Platform**: [lib/platform.js] defines the Platform objects, which define the different platforms we build for. Use `config.getTargetPlatforms()` to get the list of platforms we are targeting in this build, `config.getNodePlatforms()` to get the list of platform we will download node for, or `config.getLinux/Windows/MacPlatform()` to get a specific platform.

**Log**: We uses the `ToolingLog` defined in [../tooling_log/tooling_log.js]

**Runner**: [lib/runner.js] defines the runner used to execute tasks. It calls tasks with specific arguments based on whether they are global or not.

**Build**:  [lib/build.js], created by the runner and passed to tasks so they can resolve paths and get information about the build they are operating on.

[tasks/\*]: ./tasks
[lib/config.js]: ./lib/config.js
[lib/platform.js]: ./lib/platform.js
[lib/runner.js]: ./lib/runner.js
[lib/build.js]: ./lib/build.js
[build_distributables.js]: ./build_distributables.js
[../tooling_log/tooling_log.js]: ../tooling_log/tooling_log.js

# Client Node Modules Cleaning

We have introduced in our bundle a webpack dll for the client vendor modules in order to improve
the optimization time both in dev and in production. As for those modules we already have the 
code into the vendors_${chunk_number}.bundle.dll.js we have decided to delete those bundled modules from the 
distributable node_modules folder. However, in order to accomplish this, we need to exclude 
every node_module used in the server side code. This logic is performed 
under `nodejs_modules/clean_client_modules_on_dll_task.js`. In case we need to add any new cli
or any other piece of server code other than `x-pack` or `core_plugins` we'll need
to update the globs present on `clean_client_modules_on_dll_task.js` accordingly.
