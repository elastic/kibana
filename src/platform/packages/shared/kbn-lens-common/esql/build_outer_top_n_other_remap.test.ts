/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OTHER_BUCKET_ESQL_LITERAL,
  buildOtherBucketLabelFragment,
  buildOtherBucketNamedFlagFragment,
  buildOuterTopNOtherRemap,
} from './build_outer_top_n_other_remap';

describe('buildOuterTopNOtherRemap', () => {
  it('keeps top-N values in a typed key within the main query time range', () => {
    expect(
      buildOuterTopNOtherRemap({
        source: 'kibana_sample_data_logs',
        timeFilter: 'WHERE timestamp >= ?_tstart AND timestamp <= ?_tend',
        groupExpr: 'host.keyword',
        scoreFragment: 'AVG(bytes)',
        sortClause: '`AVG(bytes)` DESC',
        size: 3,
        keyAlias: 'key_host_keyword',
      })
    ).toBe(
      'EVAL key_host_keyword = CASE(host.keyword IN (FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | WHERE host.keyword IS NOT NULL | STATS AVG(bytes) BY host.keyword | SORT `AVG(bytes)` DESC | LIMIT 3 | KEEP host.keyword), host.keyword, NULL)'
    );
  });

  it('omits the time range for data views without a time field', () => {
    expect(
      buildOuterTopNOtherRemap({
        source: 'ft_ecommerce',
        groupExpr: 'category.keyword',
        scoreFragment: 'COUNT(*)',
        sortClause: 'category.keyword ASC',
        size: 5,
        keyAlias: 'key_category_keyword',
      })
    ).toBe(
      'EVAL key_category_keyword = CASE(category.keyword IN (FROM ft_ecommerce | WHERE category.keyword IS NOT NULL | STATS COUNT(*) BY category.keyword | SORT category.keyword ASC | LIMIT 5 | KEEP category.keyword), category.keyword, NULL)'
    );
  });
});

describe('buildOtherBucketNamedFlagFragment', () => {
  it('uses a long flag so DESC sort keeps named values first without matching the metric type', () => {
    expect(
      buildOtherBucketNamedFlagFragment({
        flagAlias: 'named_host_keyword',
        keyAlias: 'key_host_keyword',
      })
    ).toBe('named_host_keyword = CASE(key_host_keyword IS NULL, 0::LONG, 1::LONG)');
  });
});

describe('buildOtherBucketLabelFragment', () => {
  it('restores the field as keyword labels with Other for the null key', () => {
    expect(buildOtherBucketLabelFragment({ groupExpr: 'clientip', keyAlias: 'key_clientip' })).toBe(
      `clientip = COALESCE(TO_STRING(key_clientip), ${OTHER_BUCKET_ESQL_LITERAL})`
    );
  });
});
