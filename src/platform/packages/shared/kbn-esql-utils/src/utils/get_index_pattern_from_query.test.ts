/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getIndexPatternFromESQLQuery } from './get_index_pattern_from_query';

describe('getIndexPatternFromESQLQuery', () => {
  it('should return the index pattern string from esql queries', () => {
    const idxPattern1 = getIndexPatternFromESQLQuery('FROM foo');
    expect(idxPattern1).toBe('foo');

    const idxPattern3 = getIndexPatternFromESQLQuery('from foo | project abc, def');
    expect(idxPattern3).toBe('foo');

    const idxPattern4 = getIndexPatternFromESQLQuery('from foo | project a | limit 2');
    expect(idxPattern4).toBe('foo');

    const idxPattern5 = getIndexPatternFromESQLQuery('from foo | limit 2');
    expect(idxPattern5).toBe('foo');

    const idxPattern6 = getIndexPatternFromESQLQuery('from foo-1,foo-2 | limit 2');
    expect(idxPattern6).toBe('foo-1,foo-2');

    const idxPattern7 = getIndexPatternFromESQLQuery('from foo-1, foo-2 | limit 2');
    expect(idxPattern7).toBe('foo-1,foo-2');

    const idxPattern8 = getIndexPatternFromESQLQuery('FROM foo-1,  foo-2');
    expect(idxPattern8).toBe('foo-1,foo-2');

    const idxPattern9 = getIndexPatternFromESQLQuery('FROM foo-1, foo-2 metadata _id');
    expect(idxPattern9).toBe('foo-1,foo-2');

    const idxPattern10 = getIndexPatternFromESQLQuery('FROM foo-1, remote_cluster:foo-2, foo-3');
    expect(idxPattern10).toBe('foo-1,remote_cluster:foo-2,foo-3');

    const idxPattern11 = getIndexPatternFromESQLQuery(
      'FROM foo-1, foo-2 | where event.reason like "*Disable: changed from [true] to [false]*"'
    );
    expect(idxPattern11).toBe('foo-1,foo-2');

    const idxPattern12 = getIndexPatternFromESQLQuery('FROM foo-1, foo-2 // from command used');
    expect(idxPattern12).toBe('foo-1,foo-2');

    const idxPattern13 = getIndexPatternFromESQLQuery('ROW a = 1, b = "two", c = null');
    expect(idxPattern13).toBe('');

    const idxPattern14 = getIndexPatternFromESQLQuery('TS tsdb');
    expect(idxPattern14).toBe('tsdb');

    const idxPattern15 = getIndexPatternFromESQLQuery('TS tsdb | STATS max(cpu) BY host');
    expect(idxPattern15).toBe('tsdb');

    const idxPattern16 = getIndexPatternFromESQLQuery(
      'TS pods | STATS load=avg(cpu), writes=max(rate(indexing_requests)) BY pod | SORT pod'
    );
    expect(idxPattern16).toBe('pods');

    const idxPattern17 = getIndexPatternFromESQLQuery('FROM "$foo%"');
    expect(idxPattern17).toBe('$foo%');

    const idxPattern18 = getIndexPatternFromESQLQuery('FROM """foo-{{mm-dd_yy}}"""');
    expect(idxPattern18).toBe('foo-{{mm-dd_yy}}');

    const idxPattern19 = getIndexPatternFromESQLQuery('FROM foo-1::data');
    expect(idxPattern19).toBe('foo-1::data');

    // subqueries
    const idxPattern20 = getIndexPatternFromESQLQuery(
      'FROM index1, (FROM index2, index3 | WHERE field >0)'
    );
    expect(idxPattern20).toBe('index1,index2,index3');

    const idxPattern21 = getIndexPatternFromESQLQuery(
      'TS index1, (FROM index2, index3 | WHERE field >0)'
    );
    expect(idxPattern21).toBe('index1,index2,index3');

    const idxPattern22 = getIndexPatternFromESQLQuery(
      'FROM index1, (FROM index2, index3 | WHERE field >0), (FROM index4, index3 | STATS BY field2)'
    );
    expect(idxPattern22).toBe('index1,index2,index3,index4');

    const idxPattern23 = getIndexPatternFromESQLQuery(
      'PROMQL index = kibana_sample_data_logstsdb step="5m" start=?_tstart end=?_tend avg(bytes)'
    );
    expect(idxPattern23).toBe('kibana_sample_data_logstsdb');
  });
});
