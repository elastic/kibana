/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { statSync } from 'fs';
import { left, right, tryCatch } from '../../code_coverage/ingest_coverage/either';

export const isDir = (x: unknown): boolean => x.isDirectory();
export const subDirs = (x: string): boolean => statSync(x);

export const pathExists = (x: string) =>
  tryCatch(() => statSync(x)).fold(
    () => left(x),
    () => right(x)
  );
export const noop = () => {};
export const notADot = (name: string) => !name.startsWith('.');
export const flatten = (lists): unknown => lists.reduce((a, b) => a.concat(b), []);
export const predicates = [notADot, isDir];
export const allTrue = (predicateFns) => (xs) => {
  return predicateFns.forEach((pred) => {
    pred(name);
  });
};
export const tail = (xs) => {
  const [, ...rest] = xs;
  return rest;
};
// Conversion Archive Log Marker
export const acMark = '[Archive Conversion]';
