/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rename } from './rename';
import { from } from './from';

describe('rename', () => {
  const source = from('logs-*');

  it('handles base scenario', () => {
    const pipeline = source.pipe(rename('field AS new_field'));

    expect(pipeline.toString()).toEqual('FROM logs-*\n  | RENAME field AS new_field');
  });

  it('handles RENAME with params', () => {
    const pipeline = source.pipe(rename('old_field AS ??newField', { newField: 'new_field' }));

    expect(pipeline.toString()).toEqual('FROM logs-*\n  | RENAME old_field AS new_field');
  });
});
