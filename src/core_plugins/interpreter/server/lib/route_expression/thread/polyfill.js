/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// taken from kibana/src/setup_node_env/babel_register/polyfill.js
// ...
// `babel-preset-env` looks for and rewrites the following import
// statement into a list of import statements based on the polyfills
// necessary for our target environment (the current version of node)
// but since it does that during compilation, `import 'babel-polyfill'`
// must be in a file that is loaded with `require()` AFTER `babel-register`
// is configured.
//
// This is why we have this single statement in it's own file and require
// it from ./babeled.js
import 'babel-polyfill';
