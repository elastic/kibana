# Codesearch

## Source

The source for the CodeSearch plugin can be found in `kibana-extras/castro`. This is in the correct location to use a local checkout of the Kibana repository that is created in `kibana` the first time you run `./gradlew bootstrap`

## Development

See the [contributing guide](./CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following scripts.

  - `./gradlew bootstrap`

    Create or update the Kibana checkout in the `kibana` directory and install dependencies in both Kibana and CodeSearch.

    > ***IMPORTANT:*** Use this script instead of `yarn` to install dependencies, when switching branches, and re-run it whenever your dependencies change.

  - `./gradlew startDeps`

    Start an elasticsearch instance using a nightly snapshot

  - `./gradlew startKibana`

    Start kibana and have it include the codesearch plugin