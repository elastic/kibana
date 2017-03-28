# kibana dev scripts

This directory contains scripts useful for interacting with Kibana tools in development. Use the node executable and `--help` flag to learn about how they work:

```sh
node scripts/{{script name}} --help
```

## for developers

This directory is excluded from the build and tools within it should help users discover their capabilities. Each script in this directory must:

- include the `../src/optimize/babel/register` module to bootstrap babel
- call out to source code that is in the `src` directory
- react to the `--help` flag
- run everywhere OR check and fail fast when a required OS or toolchain is not available