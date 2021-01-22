/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import { promisify } from 'util';

export const readFile = promisify(Fs.readFile);
export const writeFile = promisify(Fs.writeFile);
export const mkdir = promisify(Fs.mkdir);
export const exists = promisify(Fs.exists);
