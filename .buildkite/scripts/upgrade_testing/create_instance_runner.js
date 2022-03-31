/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const createInstance = require('./create_instance');
const yargs = require('yargs');

(async () => {
  const argv = yargs
    .option('stackVersion', {
      alias: 'v',
      description: 'Cloud stack version',
      type: 'string',
    })
    .demandOption('stackVersion')
    .help()
    .alias('help', 'h').argv;

  return await createInstance(argv.stackVersion);
})();
