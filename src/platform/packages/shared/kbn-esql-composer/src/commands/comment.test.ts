/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { from } from './from';
import { comment } from './comment';
import { stats } from './stats';

describe('comment', () => {
  it('adds comments to the query', () => {
    const pipeline = from('logs-*')
      .pipe(stats('count = COUNT(*)'))
      .pipe(comment('This is a test comment'))
      .pipe(stats('avg = AVG(value)'));

    expect(pipeline.toString()).toContain('// This is a test comment');
  });

  it('positions comments correctly', () => {
    const pipeline = from('logs-*')
      .pipe(comment('First comment'))
      .pipe(stats('count = COUNT(*)'))
      .pipe(comment('Second comment'))
      .pipe(stats('avg = AVG(value)'));

    const queryString = pipeline.toString();
    const lines = queryString.split('\n');

    expect(lines[1]).toContain('// First comment');
    expect(lines[3]).toContain('// Second comment');
  });

  it('handles multiple comments', () => {
    const pipeline = from('logs-*')
      .pipe(comment('Comment 1'))
      .pipe(comment('Comment 2'))
      .pipe(stats('count = COUNT(*)'));

    const queryString = pipeline.toString();
    expect(queryString).toContain('// Comment 1');
    expect(queryString).toContain('// Comment 2');
  });

  it('does not add // prefix if already present', () => {
    const pipeline = from('logs-*').pipe(comment('This is a comment'));

    const queryString = pipeline.toString();
    expect(queryString).toContain('// This is a comment');
    expect(queryString).not.toContain('// // This is a comment');
  });
});
