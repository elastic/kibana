# Setting Up Your Development Environment

> You'll need to have a `java` binary in `PATH` or set `JAVA_HOME` to use the gradlew scripts.
> On windows use `./gradlew.bat` anywhere you see `./gradlew`

Fork, then clone the `code` repo and move into it

```bash
git clone https://github.com/[YOUR_USERNAME]/castro.git code
cd code
```

Bootstrap the castro repo and pull a local checkout of the Kibana repo by running the bootstrap gradle task

```bash
./gradlew bootstrap
```

Move into the Kibana checkout and start elasticsearch from a nightly snapshot.

```bash
./gradlew startDeps
```

Start Kibana with code

```bash
./gradlew startKibana
```

In order to develop code intelligence feature, you need to checkout submodule:

```bash
./scripts/update
```

then run

```bash
./gradlew lsp:javascript:build
```