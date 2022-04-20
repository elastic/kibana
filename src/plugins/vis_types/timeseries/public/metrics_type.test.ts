/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { DataView } from '@kbn/data-views-plugin/public';
import { setDataViewsStart } from './services';
import type { TimeseriesVisParams } from './types';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { metricsVisDefinition } from './metrics_type';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
describe('metricsVisDefinition', () => {
  describe('getUsedIndexPattern', () => {
    const indexPattern1 = { id: '1', title: 'pattern1' } as unknown as DataView;
    const indexPattern2 = { id: '2', title: 'pattern2' } as unknown as DataView;
    let defaultParams: TimeseriesVisParams;

    beforeEach(async () => {
      setDataViewsStart({
        async getDefault() {
          return indexPattern1;
        },
        async find(title: string, size: number) {
          if (size !== 1) {
            throw new Error('trying to fetch too many data views');
          }
          if (title === 'pattern1') return [indexPattern1];
          if (title === 'pattern2') return [indexPattern2];
          return [];
        },
        async get(id: string) {
          if (id === '1') return indexPattern1;
          if (id === '2') return indexPattern2;
          throw new Error();
        },
      } as DataViewsPublicPluginStart);
      defaultParams = (
        await metricsVisDefinition.setup!({
          params: cloneDeep(metricsVisDefinition.visConfig.defaults),
        } as unknown as Vis<TimeseriesVisParams>)
      ).params;
    });

    it('should resolve correctly the base index pattern by id', async () => {
      expect(
        (
          await metricsVisDefinition.getUsedIndexPattern!({
            ...defaultParams,
            index_pattern: { id: '1' },
          })
        )[0]
      ).toBe(indexPattern1);
    });

    it('should resolve correctly the base index pattern by name', async () => {
      expect(
        (
          await metricsVisDefinition.getUsedIndexPattern!({
            ...defaultParams,
            index_pattern: 'pattern2',
          })
        )[0]
      ).toBe(indexPattern2);
    });

    it('should resolve correctly the series overrides by name and id', async () => {
      const resolvedPatterns = await metricsVisDefinition.getUsedIndexPattern!({
        ...defaultParams,
        index_pattern: { id: '1' },
        series: [
          {
            ...defaultParams.series[0],
            override_index_pattern: 1,
            series_index_pattern: 'pattern1',
          },
          {
            ...defaultParams.series[0],
            override_index_pattern: 1,
            series_index_pattern: { id: '2' },
          },
        ],
      });
      expect(resolvedPatterns[0]).toBe(indexPattern1);
      expect(resolvedPatterns[1]).toBe(indexPattern2);
      expect(resolvedPatterns[2]).toBe(indexPattern1);
    });

    it('should correctly resolve annotation index patterns along with series', async () => {
      const resolvedPatterns = await metricsVisDefinition.getUsedIndexPattern!({
        ...defaultParams,
        index_pattern: { id: '1' },
        series: [
          {
            ...defaultParams.series[0],
            override_index_pattern: 1,
            series_index_pattern: { id: '2' },
          },
        ],
        annotations: [{ index_pattern: 'pattern1' }, { index_pattern: { id: '2' } }],
      });
      expect(resolvedPatterns[0]).toBe(indexPattern1);
      expect(resolvedPatterns[1]).toBe(indexPattern2);
      expect(resolvedPatterns[2]).toBe(indexPattern2);
      expect(resolvedPatterns[3]).toBe(indexPattern1);
    });

    it('should return default index pattern if none is specified', async () => {
      const resolvedPatterns = await metricsVisDefinition.getUsedIndexPattern!({
        ...defaultParams,
        index_pattern: undefined,
        series: [],
      });
      expect(resolvedPatterns[0]).toBe(indexPattern1);
    });
  });
});
