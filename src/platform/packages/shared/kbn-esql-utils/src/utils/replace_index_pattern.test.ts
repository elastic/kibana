/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replaceESQLQueryIndexPattern } from './replace_index_pattern';

describe('replaceESQLQueryIndexPattern', () => {
  it('replaces index pattern', () => {
    const query = replaceESQLQueryIndexPattern('FROM one, two | STATS COUNT(*) BY host.name', {
      two: 'updated',
    });
    expect(query).toEqual('FROM one, updated | STATS COUNT(*) BY host.name');
  });

  it('replaces duplicates pattern', () => {
    const query = replaceESQLQueryIndexPattern('FROM one, one | STATS COUNT(*) BY host.name', {
      one: 'updated',
    });
    expect(query).toEqual('FROM updated | STATS COUNT(*) BY host.name');
  });

  it('replaces remote index pattern', () => {
    const query = replaceESQLQueryIndexPattern(
      'FROM remote:one, remote_two:one | STATS COUNT(*) BY host.name',
      {
        'remote:one': 'remote_updated:one',
      }
    );
    expect(query).toEqual('FROM remote_two:one, remote_updated:one | STATS COUNT(*) BY host.name');
  });

  it('replaces remote index patterns if only the index matches', () => {
    const query = replaceESQLQueryIndexPattern(
      'FROM remote_one:one, remote_two:one | STATS COUNT(*) BY host.name',
      {
        one: 'remote_three:one',
      }
    );
    expect(query).toEqual('FROM remote_three:one | STATS COUNT(*) BY host.name');
  });

  it('is a noop if no matching replacements', () => {
    const query = replaceESQLQueryIndexPattern('FROM one, two | STATS COUNT(*) BY host.name', {
      three: 'updated',
    });
    expect(query).toEqual('FROM one, two | STATS COUNT(*) BY host.name');
  });
});
