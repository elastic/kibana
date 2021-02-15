/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { resolve } from 'path';

process.argv.push('--no-exit'); // don't exit after encountering a rule error
process.argv.push('--verbose'); // print results
process.argv.push('--max-warnings', '0'); // return nonzero exit code on any warnings
process.argv.push('--config', resolve(__dirname, '..', '..', '.sass-lint.yml')); // configuration file

// common-js is required so that logic before this executes before loading sass-lint
require('sass-lint/bin/sass-lint');
