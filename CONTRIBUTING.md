# Contributing

### Run

```
yarn start --branch 6.1 --repo backport-org/backport-demo --all
```

**Run `backport` CLI globally**
This will build backport continously and link it, so it can accessed with `backport` command globally

```
yarn tsc && sudo chmod +x bin/backport && yarn link && yarn tsc --watch
```

**Remove linked backport**
```
yarn global remove backport; npm -g uninstall backport; yarn unlink backport; yarn unlink;
```

You can now use `backport` command anywhere, and it'll point to the development version.

### Debug

**Run tests**

```
yarn test
```

**Run tests continously**

```
yarn test --watch
```

**Compile typescript continously**

```
yarn tsc --watch
```
