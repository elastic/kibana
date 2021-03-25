# Vis type Timelion

Contains the timelion visualization and the timelion backend.

# Generate a parser

If your grammar was changed in `packages/kbn-interpreter/src/plugins/vis_type_timelion/chain.peg` you need to re-generate the static parser. You can use the yarn script in `kbn-interpreter`:

```
yarn vis_type_timelion:peg
```

The generated parser will be appeared at `packages/kbn-interpreter/src/plugins/vis_type_timelion` folder, which is included in `.eslintignore`
