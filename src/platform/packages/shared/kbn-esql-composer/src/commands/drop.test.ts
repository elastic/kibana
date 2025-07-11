/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { drop } from './drop';
import { from } from './from';

describe('drop', () => {
  const source = from('logs-*');
  it('handles single strings', () => {
    const pipeline = source.pipe(drop('log.level', 'service.name'));
    const queryRequest = pipeline.asQuery();

    expect(queryRequest).toEqual('FROM logs-*\n  | DROP log.level, service.name');
  });

  it('handles arrays of strings', () => {
    const pipeline = source.pipe(drop(['log.level', 'service.name']));
    const queryRequest = pipeline.asQuery();

    expect(queryRequest).toEqual('FROM logs-*\n  | DROP log.level, service.name');
  });
});
