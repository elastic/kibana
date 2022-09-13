/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Index {
  kind: 'index';
  target: Lowercase<string>;
}
export interface DataStream {
  kind: 'dataStream';
  target: Lowercase<string>;
}
export type WriteTarget = DataStream | Index;
export function index(name: string): Index {
  return { kind: 'index', target: name };
}
export function dataStream(name: string): DataStream {
  return { kind: 'dataStream', target: name };
}
