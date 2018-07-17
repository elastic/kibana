# Codesearch

## Source

The source for the CodeSearch plugin can be found in `kibana-extras/castro`. This is in the correct location to use a local checkout of the Kibana repository that is created in `kibana` the first time you run `./gradlew bootstrap`

## Development

See the [contributing guide](./CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following scripts.

  - `./gradlew bootstrap`

    Clone or update the local Kibana checkout, then install dependencies in Kibana and codesearch. This task is automatically run by all other tasks and is pretty aggressively cached. If you experience issues and want to bypass the cache run it with the `--no-build-cache` flag.

  - `./gradlew startDeps`

    Start an elasticsearch instance using a nightly snapshot.

  - `./gradlew startKibana`

    Start kibana and have it include the codesearch plugin.

  - `./gradlew lint`

    Lint the sourcecode with [`tslint`](https://github.com/palantir/tslint).

  - `./gradlew lintFix`

    Lint the sourcecode with [`tslint`](https://github.com/palantir/tslint) and fix any auto-fixable errors.