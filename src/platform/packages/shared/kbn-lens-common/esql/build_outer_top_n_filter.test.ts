/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1";
 */

import { buildOuterTopNFilter } from './build_outer_top_n_filter';

describe('buildOuterTopNFilter', () => {
  it('ranks the outer values by a metric within the main query time range', () => {
    expect(
      buildOuterTopNFilter({
        source: 'kibana_sample_data_logs',
        timeFilter: 'WHERE timestamp >= ?_tstart AND timestamp <= ?_tend',
        groupExpr: 'geo.src',
        scoreFragment: 'AVG(bytes)',
        sortClause: '`AVG(bytes)` DESC',
        size: 5,
      })
    ).toBe(
      'WHERE geo.src IN (FROM kibana_sample_data_logs | WHERE timestamp >= ?_tstart AND timestamp <= ?_tend | STATS AVG(bytes) BY geo.src | SORT `AVG(bytes)` DESC | LIMIT 5 | KEEP geo.src)'
    );
  });

  it('omits the time range for data views without a time field', () => {
    expect(
      buildOuterTopNFilter({
        source: 'ft_ecommerce',
        groupExpr: 'category.keyword',
        scoreFragment: 'COUNT(*)',
        sortClause: 'category.keyword ASC',
        size: 3,
      })
    ).toBe(
      'WHERE category.keyword IN (FROM ft_ecommerce | STATS COUNT(*) BY category.keyword | SORT category.keyword ASC | LIMIT 3 | KEEP category.keyword)'
    );
  });

  it('keeps the metric alias so the subquery can sort by it', () => {
    expect(
      buildOuterTopNFilter({
        source: 'kibana_sample_data_logs',
        groupExpr: 'agent.keyword',
        scoreFragment: 'avg_bytes = AVG(bytes)',
        sortClause: 'avg_bytes ASC',
        size: 4,
      })
    ).toBe(
      'WHERE agent.keyword IN (FROM kibana_sample_data_logs | STATS avg_bytes = AVG(bytes) BY agent.keyword | SORT avg_bytes ASC | LIMIT 4 | KEEP agent.keyword)'
    );
  });
});
