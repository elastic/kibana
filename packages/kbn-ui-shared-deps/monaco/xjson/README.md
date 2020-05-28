# README

This folder contains the language definitions for XJSON used by the Monaco editor.

## Summary of contents

Note: All source code.

### ./worker

The worker proxy and worker instantiation code used in both the main thread and the worker thread.

### ./dist

The transpiled, production-ready version of the worker code that will be loaded by Monaco client side.
Currently this is not served by Kibana but raw-loaded as a string and served with the source code via
the "raw-loader".

See the related ./webpack.xjson-worker.config.js file that is runnable with Kibana's webpack with:

```sh
yarn webpack --config ./monaco/xjson/webpack.worker.config.js
```

### ./lexer_rules

Contains the Monarch-specific language tokenization rules for XJSON

### ./constants.ts

Contains the unique language ID.

### ./language

Takes care of global setup steps for the language (like registering it against Monaco) and exports a way to load up
the grammar parser.

### ./worker_proxy_service

A stateful mechanism for holding a reference to the Monaco-provided proxy getter.
