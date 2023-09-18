/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { join, dirname } from 'path';
import { bin } from 'eslint/package.json';

// Since eslint 8.0 we can't resolve `eslint/bin/eslint` directly since it's
// not exported in the eslint package.json file. Instead we need to resolve it
// using the following hack:
export const eslintBinPath = join(dirname(require.resolve('eslint/package.json')), bin.eslint);
