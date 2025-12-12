/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './from';
import { keep } from './keep';

describe('keep', () => {
  const source = from('logs-*');
  it('should build KEEP from single strings', () => {
    const pipeline = source.pipe(keep('log.level', 'service.name'));
    const queryRequest = pipeline.toString();

    expect(queryRequest).toEqual('FROM logs-*\n  | KEEP log.level, service.name');
  });

  it('should build KEEP from array of strings', () => {
    const pipeline = source.pipe(keep(['log.level', 'service.name']));
    const queryRequest = pipeline.toString();

    expect(queryRequest).toEqual('FROM logs-*\n  | KEEP log.level, service.name');
  });
});
