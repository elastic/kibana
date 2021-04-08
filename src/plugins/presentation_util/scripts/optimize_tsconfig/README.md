### Optimizing TypeScript for Presentation Team Development

> Hard forked from:
> `x-pack/plugins/apm/scripts/optimize-tsconfig.js`

Kibana is a very large TypeScript projects, and it comes at a cost.  To get TS to perform faster, we can optimize the root `tsconfig.json` to only look at plugins we're interested in.

This optimization consists of altering the `tsconfig.json` in Kibana to only use the project paths we specify.  The script then configures git to ignore any changes in these files (so changes are not accidentally committed to `master`).  There is `--revert` option, as well.

To run the optimization:

`$ node scripts/optimize_tsconfig`

To undo the optimization:

`$ node optimize_tsconfig --revert`