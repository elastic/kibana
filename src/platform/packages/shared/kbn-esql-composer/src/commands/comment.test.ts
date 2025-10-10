/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from } from './from';
import { stats } from './stats';
import { evaluate } from './eval';
import { drop } from './drop';
import { where } from './where';
import { keep } from './keep';
import { limit } from './limit';
import { rename } from './rename';
import { sort, SortOrder } from './sort';

describe('command comments', () => {
  it('adds comments to evaluate commands', () => {
    const pipeline = from('logs-*').pipe(
      evaluate('new_field = old_field * 2', undefined, { comment: 'Calculate doubled value' })
    );

    expect(pipeline.toString()).toContain('// Calculate doubled value');
    expect(pipeline.toString()).toContain('| EVAL new_field = old_field * 2');
  });

  it('adds comments to stats commands', () => {
    const pipeline = from('logs-*').pipe(
      stats('count = COUNT(*)', undefined, { comment: 'Count total records' })
    );

    expect(pipeline.toString()).toContain('// Count total records');
    expect(pipeline.toString()).toContain('| STATS count = COUNT(*)');
  });

  it('adds comments to drop commands', () => {
    const pipeline = from('logs-*').pipe(drop('unwanted_field', { comment: 'Remove unnecessary field' }));

    expect(pipeline.toString()).toContain('// Remove unnecessary field');
    expect(pipeline.toString()).toContain('| DROP unwanted_field');
  });

  it('adds comments to where commands', () => {
    const pipeline = from('logs-*').pipe(
      where('status == 200', undefined, { comment: 'Filter successful requests' })
    );

    expect(pipeline.toString()).toContain('// Filter successful requests');
    expect(pipeline.toString()).toContain('| WHERE status == 200');
  });

  it('adds comments to keep commands', () => {
    const pipeline = from('logs-*').pipe(keep('field1', 'field2', { comment: 'Keep only necessary fields' }));

    expect(pipeline.toString()).toContain('// Keep only necessary fields');
    expect(pipeline.toString()).toContain('| KEEP field1, field2');
  });

  it('adds comments to limit commands', () => {
    const pipeline = from('logs-*').pipe(limit(100, { comment: 'Limit to 100 results' }));

    expect(pipeline.toString()).toContain('// Limit to 100 results');
    expect(pipeline.toString()).toContain('| LIMIT 100');
  });

  it('adds comments to rename commands', () => {
    const pipeline = from('logs-*').pipe(
      rename('old_name AS new_name', undefined, { comment: 'Rename field' })
    );

    expect(pipeline.toString()).toContain('// Rename field');
    expect(pipeline.toString()).toContain('| RENAME old_name AS new_name');
  });

  it('adds comments to sort commands', () => {
    const pipeline = from('logs-*').pipe(
      sort({ '@timestamp': SortOrder.Desc }, { comment: 'Sort by timestamp descending' })
    );

    expect(pipeline.toString()).toContain('// Sort by timestamp descending');
    expect(pipeline.toString()).toContain('| SORT @timestamp DESC');
  });

  it('handles multiple commands with comments', () => {
    const pipeline = from('metrics-*')
      .pipe(
        stats(
          'AVG(cpu.usage) BY BUCKET(@timestamp, 100, ?_tstart, ?_tend), host.name',
          { _tstart: 1000, _tend: 2000 }
        )
      )
      .pipe(
        evaluate('__DIMENSIONS__ = CONCAT(host.name)', undefined, {
          comment:
            'Technical preview: The following two commands are needed during the preview and will be removed once the feature is generally available (GA)',
        })
      )
      .pipe(drop('host.name', { comment: 'Clean up original dimension field' }));

    const queryString = pipeline.toString();
    expect(queryString).toContain(
      '// Technical preview: The following two commands are needed during the preview and will be removed once the feature is generally available (GA)'
    );
    expect(queryString).toContain('// Clean up original dimension field');
  });

  it('works without comments (backward compatibility)', () => {
    const pipeline = from('logs-*')
      .pipe(stats('count = COUNT(*)'))
      .pipe(evaluate('new_field = old_field * 2'));

    expect(pipeline.toString()).not.toContain('//');
    expect(pipeline.toString()).toContain('| STATS count = COUNT(*)');
    expect(pipeline.toString()).toContain('| EVAL new_field = old_field * 2');
  });

  it('handles mixed commands with and without comments', () => {
    const pipeline = from('logs-*')
      .pipe(where('status == 200'))
      .pipe(stats('count = COUNT(*)', undefined, { comment: 'Count successful requests' }))
      .pipe(limit(10));

    const queryString = pipeline.toString();
    expect(queryString).toContain('// Count successful requests');
    expect(queryString).toContain('| WHERE status == 200');
    expect(queryString).toContain('| STATS count = COUNT(*)');
    expect(queryString).toContain('| LIMIT 10');
  });
});
