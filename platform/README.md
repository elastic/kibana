# New platform

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

