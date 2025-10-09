/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { comment } from './comment';
import { from } from './from';
import { where } from './where';

describe('comment', () => {
  const source = from('logs-*');

  it('adds a single-line comment to the pipeline', () => {
    const pipeline = source.pipe(comment('This is a comment'));

    const result = pipeline.toString();
    // The comment should appear in the output
    expect(result).toContain('// This is a comment');
    // A ROW 1 command should be added as a carrier for the comment
    expect(result).toContain('ROW 1');
    expect(result).toContain('FROM logs-*');
  });

  it('adds a multi-line comment to the pipeline', () => {
    const pipeline = source.pipe(comment('Line 1\nLine 2\nLine 3'));

    const result = pipeline.toString();
    // Multi-line comments should use /* */ syntax
    expect(result).toContain('/* Line 1');
    expect(result).toContain('Line 2');
    expect(result).toContain('Line 3 */');
    expect(result).toContain('ROW 1');
  });

  it('can chain comments with other commands', () => {
    const pipeline = source.pipe(
      comment('Filter logs'),
      where('@timestamp >= NOW() - 1 hour')
    );

    const result = pipeline.toString();
    expect(result).toContain('// Filter logs');
    expect(result).toContain('WHERE @timestamp >= NOW() - 1 hour');
  });

  it('can add multiple comments', () => {
    const pipeline = source.pipe(
      comment('First comment'),
      comment('Second comment'),
      where('@timestamp >= NOW() - 1 hour')
    );

    const result = pipeline.toString();
    expect(result).toContain('// First comment');
    expect(result).toContain('// Second comment');
  });
});
