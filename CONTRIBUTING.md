# Contributing

### Run

```
yarn start --branch 6.1 --upstream backport-org/backport-demo --all
```

or

```
# Compile
yarn tsc

# Run
node dist/entrypoint.cli.js --branch 6.1 --upstream backport-org/backport-demo --all
```

**Run `backport` CLI globally**

```
yarn global remove backport
npm -g uninstall backport
yarn unlink backport
yarn unlink
yarn link
sudo chmod +x dist/entrypoint.cli.js
yarn tsc --watch
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
