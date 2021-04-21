# Vis type Timelion

Contains the timelion visualization and the timelion backend.

# Generate a parser
If your grammar was changed in `public/chain.peggy` you need to re-generate the static parser. You could use a grunt task:

```
grunt peg:timelion_chain
```

or you can run `node_modules/.bin/peggy -o common/_generated_/chain.js common/chain.peggy` directly.

The generated parser will be appeared at `common/_generated_` folder
