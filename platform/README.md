# New platform

## Dev setup

Make sure you're running the Node version specified in `../.node-version`.

## TypeScript

```
npm run ts:start
```

This builds the code into `./ts-tmp/` for now. If you get into a weird state you
might clean the `ts-tmp` directory.

## VSCode

If you want to see what it looks like with fantastic editor support.

```
$ cat ~/.vscode/settings.json
// Place your settings in this file to overwrite default and user settings.
{
  "typescript.tsdk": "./node_modules/typescript/lib",
  "typescript.referencesCodeLens.enabled": true
}
```

## Running code

(Make sure to build the code first, e.g. `npm run ts:build` or `npm run ts:start`)

Start the server and plugins:

```
node scripts/platform.js
```

If you update `config/kibana.yml` to e.g. contain `pid.file: ./kibana.pid`
you'll also see it write the PID file. (You can do this while running and just
send a SIGHUP.)

With failure:

```
node scripts/platform.js -c ./config/kibana.dev.yml --port "test"
```

## Running tests

Run Jest:

```
node scripts/jest.js
```

(add `--watch` for re-running on change)
