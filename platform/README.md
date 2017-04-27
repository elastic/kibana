# New platform

## Flow

First install [`flow-typed`](https://github.com/flowtype/flow-typed):

```
npm install -g flow-typed
```

Then run:

```
flow-typed install
```

This pulls (or generates empty) Flow libdefs for dependencies into the
`./flow-typed` folder.

(If we keep Flow we'll follow the recommended setup and commit `flow-typed/` to
our repo.)

## Types in VSCode

To get Flow running in VSCode:

```
$ cat .vscode/settings.json
{
  "flow.enabled": true,
  "flow.useNPMPackagedFlow": true,
  "flow.stopFlowOnExit": true,
  "javascript.validate.enable": false
}
```

For other editors check out https://flow.org/en/docs/editors/

## Running code

Just shows the parsed config:

```
node scripts/platform.js -c ./config/kibana.dev.yml
```

With failure (for now, as `logging` is missing in the schema):

```
node scripts/platform.js -c ./config/kibana.dev.yml -q
```

