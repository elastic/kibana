# kibana-plugin-helpers

[![CircleCI](https://circleci.com/gh/elastic/kibana-plugin-helpers/tree/master.svg?style=svg)](https://circleci.com/gh/elastic/kibana-plugin-helpers/tree/master)

Just some helpers for kibana plugin devs.

This simple CLI has several tasks that plugin devs can run from to easily debug, test, or package kibana plugins.

See the [docs](docs) directory for more info.

```sh
$ plugin-helpers help

  Usage: plugin-helpers [options] [command]


  Commands:

    start          start the server
    test:browser   run the browser tests
    test:server    run the server tests
    build          build a distributable archive
    help [cmd]     display help for [cmd]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number

```

# License

Apache-2.0
