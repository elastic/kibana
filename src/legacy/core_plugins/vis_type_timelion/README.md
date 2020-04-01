# Vis type Timelion

# Generate a parser
If your grammar was changed in `public/chain.peg` you need to re-generate the static parser. You could use a grunt task:

```
grunt peg:timelion_chain
```

The generated parser will be appeared at `public/_generated_` folder, which is included in `.eslintignore`