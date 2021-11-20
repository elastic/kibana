/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Note: In theory importing the polyfill should not be needed, as Babel should
// include the necessary polyfills when using `@babel/preset-env`, but for some
// reason it did not work. See https://github.com/elastic/kibana/issues/14506
import '@kbn/optimizer/target_node/node/polyfill';
