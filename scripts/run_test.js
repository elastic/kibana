/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

require('../src/setup_node_env');
console.log('Code running');
process.on('abort', function() {
   return console.log(`exiting the code implicitly`);
});
setInterval((function() {
   return console.log('code still running');
}), 1000);
