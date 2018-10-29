# Codesearch

## Source

The source for the CodeSearch plugin can be found in `kibana-extras/codesearch`. This is in the correct location to use a local checkout of the Kibana repository that is created in `kibana` the first time you run `yarn kbn bootstrap`

## Environment
Install Node version 8.11.4 and yarn version 1.10.1. If you want to quickly start the stack with tmux script, you need to install tmux and tmuxp
```$bash
brew install tmux
pip install tmuxp
```

## Development

See the [contributing guide](./CONTRIBUTING.md) for instructions setting up your development environment. Once you have completed that, use the following scripts.
  - `./scripts/update_submodule`
  
    Initialize and clone submodules like kibana, language servers, etc


All following commands need to be run under `kibana-extra/codesearch`:

  - `yarn kbn bootstrap`

    Install dependencies in Kibana and codesearch.

  - `yarn start-deps`

    Start an elasticsearch instance using a nightly snapshot.

  - `yarn start`

    Start kibana and have it include the codesearch plugin. After this is started you should be able to visit kibana interface at http://localhost:5601

  - `yarn tslint`

    Lint the sourcecode with [`tslint`](https://github.com/palantir/tslint).

  - `yarn tslint --fix`

    Lint the sourcecode with [`tslint`](https://github.com/palantir/tslint) and fix any auto-fixable errors.

  - `yarn type-check`

    Check types in the source code with the TypeScript compiler.

  - `yarn type-check --watch`

    Check types in the source code with the TypeScript compiler once initially and again whenever a source file changes.
   

You could bring up the stack and have it run in background without worry about get process killed: after bootstraping, just run
```
./scripts/tmux_session
```

Note that language servers need to be built separately:

  - Typescript: `cd lsp/javascript-typescript-langserver; yarn run build` or `yarn watch` for continuous build
  
  - Java: `cd lsp/eclipse.jdt.ls; ./mvnw package`
    
To start production environment
  - `NODE_ENV=production node $NODE_OPTIONS --no-warnings src/cli --plugin-path ../kibana-extra/codesearch --config ../config/kibana/kibana.yml`

## License

All files in this repository are subject to the Elastic License. See [`LICENSE.txt`](./LICENSE.txt) for details.
