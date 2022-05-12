/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import normalizePath from 'normalize-path';
const cwd = normalizePath(process.cwd());

export function cwdRelative(path: string) {
  return relative(cwd, path);
}

export function relative(from: string, to: string) {
  return normalizePath(Path.relative(from, to));
}

export function join(...segments: string[]) {
  return Path.join(...segments);
}

export function dirname(path: string) {
  return Path.dirname(path);
}

export function resolve(path: string) {
  return Path.isAbsolute(path) ? normalizePath(path) : join(cwd, path);
}

export function isAbsolute(path: string) {
  return Path.isAbsolute(path);
}
