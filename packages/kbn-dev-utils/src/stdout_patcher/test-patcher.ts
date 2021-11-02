/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// DO NOT MERGE THIS FILE
import fs from 'fs';
import { KibanaStdoutStatus } from './kibana_stdout_status';
import { StdoutPatcher } from './stdout_patcher';

function main() {
  new StdoutPatcher(process.stdout, new KibanaStdoutStatus());
  const array = fs.readFileSync('/home/academo/kibana-test-output.log').toString().split('\n');
  let curr = 0;
  setInterval(() => {
    // eslint-disable-next-line no-console
    console.log(array[curr]);
    curr++;
  }, 200);
}

main();
// DO NOT MERGE THIS FILE
