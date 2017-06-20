# New platform

## Dev setup

```
npm run ts:start
```

This builds the code into `./ts-tmp/` for now.

**NB** This will show a couple type errors, e.g. something like:

```
platform/server/elasticsearch/Cluster.ts(28,17): error TS2339: Property 'close' does not exist on type 'Client'.
platform/server/elasticsearch/Cluster.ts(29,23): error TS2339: Property 'close' does not exist on type 'Client'.
platform/server/http/SslConfig.ts(28,28): error TS2339: Property 'constants' does not exist on type 'typeof "crypto"'.
```

This is expected (for now), and it's related to some third-party types.

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
