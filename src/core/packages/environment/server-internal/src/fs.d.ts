/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type Fs from 'fs';
export declare const readFile: typeof Fs.readFile.__promisify__;
export declare const writeFile: typeof Fs.writeFile.__promisify__;
export declare const mkdir: typeof Fs.mkdir.__promisify__;
export declare const exists: typeof Fs.exists.__promisify__;
