/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayerColumn } from '@kbn/lens-common';
import type { MetricConfig } from '../schema/charts/metric';
import { LensConfigBuilder } from '../config_builder';

const buildColumns = (config: MetricConfig): TextBasedLayerColumn[] => {
  const builder = new LensConfigBuilder();
  const lensState = builder.fromAPIFormat(config);
  const layers = lensState.state.datasourceStates.textBased?.layers ?? {};
  return Object.values(layers).flatMap((layer) => layer.columns);
};

describe('ES|QL Control Variable reconstruction (buildESQLLayer)', () => {
  it('stamps `variable` on a column referencing a genuine Identifier Control', () => {
    const columns = buildColumns({
      type: 'metric',
      title: 'ESQL control variable',
      data_source: { type: 'esql', query: 'FROM logs | STATS COUNT(*) BY ??field' },
      metrics: [{ type: 'primary', column: 'COUNT(*)' }],
      breakdown_by: { column: '??field' },
    } as MetricConfig);

    const controlColumn = columns.find((c) => c.fieldName === '??field');
    expect(controlColumn?.variable).toBe('field');
  });

  it('does NOT stamp `variable` on a real column merely named `??x` (not a query parameter)', () => {
    const columns = buildColumns({
      type: 'metric',
      title: 'ESQL backticked column named like a control',
      data_source: { type: 'esql', query: 'FROM logs | EVAL `??x` = bytes | STATS m = SUM(`??x`)' },
      metrics: [{ type: 'primary', column: '??x' }],
    } as MetricConfig);

    const realColumn = columns.find((c) => c.fieldName === '??x');
    expect(realColumn).toBeDefined();
    expect(realColumn?.variable).toBeUndefined();
  });
});
