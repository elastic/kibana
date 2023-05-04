/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// can't use fs/promises when working with streams using file descriptors
// see https://github.com/nodejs/node/issues/35862

import Fs from 'fs';
import { promisify } from 'util';

export const open = promisify(Fs.open);
export const close = promisify(Fs.close);
export const fstat = promisify(Fs.fstat);
