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

/**
 * Convert a path to a relative path based on the current working directory.
 * All paths returned are normalized
 */
export function cwdRelative(path: string) {
  return relative(cwd, path);
}

/**
 * Convert a path to a relative path. All paths returned are normalized
 */
export function relative(from: string, to: string) {
  return toNormal(Path.relative(from, to));
}

/**
 * Join segments into a single path. All paths returned are normalized
 */
export function join(...segments: string[]) {
  return Path.join(...segments);
}

/**
 * Get all but the last segment of a path, often times the directory containing the path. All paths returned are normalized
 */
export function dirname(path: string) {
  return Path.dirname(path);
}

/**
 * Convert a relative path to an absolute path based on the current working directory. All paths returned are normalized.
 */
export function resolve(path: string) {
  return Path.isAbsolute(path) ? toNormal(path) : join(cwd, path);
}

/**
 * Returns true if the path is absolute, otherwise false
 */
export function isAbsolute(path: string) {
  return Path.isAbsolute(path);
}

/**
 * Normalizes the passed path, ensuring that all path separators are unix-style `/`
 */
export function toNormal(path: string) {
  return normalizePath(path);
}
