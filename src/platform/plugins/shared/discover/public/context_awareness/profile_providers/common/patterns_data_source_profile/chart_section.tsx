/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type FC, useState, useEffect, useRef, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { BehaviorSubject } from 'rxjs';
import { Axis, Chart, HistogramBarSeries, Position, ScaleType, Settings } from '@elastic/charts';
import { EuiSpacer, useEuiTheme, useResizeObserver } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import dateMath from '@kbn/datemath';
import { getESQLResults } from '@kbn/esql-utils';
import type { ChartSectionProps, UnifiedHistogramFetchParams } from '@kbn/unified-histogram/types';
import { computeInterval } from '@kbn/visualization-utils';
import type { DataSourceProfileProvider } from '../../../profiles';

export interface SelectedPattern {
  pattern: string;
  categoryField: string;
}

interface Props {
  selectedPattern$: BehaviorSubject<SelectedPattern | undefined>;
  chartSectionProps: ChartSectionProps;
}

interface ChartDataPoint {
  key: number;
  doc_count: number;
}

const buildTimeRangeFilter = (timeField: string, timeRange: { from: string; to: string }) => {
  const from = dateMath.parse(timeRange.from);
  const to = dateMath.parse(timeRange.to, { roundUp: true });
  if (!from || !to) return undefined;
  return {
    bool: {
      must: [],
      filter: [
        {
          range: {
            [timeField]: {
              format: 'strict_date_optional_time',
              gte: from.toISOString(),
              lte: to.toISOString(),
            },
          },
        },
      ],
      should: [],
      must_not: [],
    },
  };
};

const parseHistogramResponse = (response: {
  columns: Array<{ name: string }>;
  values: unknown[][];
}): ChartDataPoint[] => {
  const bucketIdx = response.columns.findIndex((col) => col.name === 'bucket');
  const countIdx = response.columns.findIndex((col) => col.name === 'count');
  return response.values.map((row) => ({
    key: new Date(row[bucketIdx] as string).getTime(),
    doc_count: row[countIdx] as number,
  }));
};

const PatternChart: FC<Props> = ({ selectedPattern$, chartSectionProps }) => {
  const { euiTheme } = useEuiTheme();
  const selectedPattern = useObservable(selectedPattern$, undefined);
  const { services, fetch$, histogramCss } = chartSectionProps;
  const search = services.data.search.search;
  const xAxisFormatter = services.fieldFormats.deserialize({ id: 'date' });

  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerSize = useResizeObserver(containerEl);

  const [totalData, setTotalData] = useState<ChartDataPoint[]>([]);
  const [patternData, setPatternData] = useState<ChartDataPoint[]>([]);
  const [latestParams, setLatestParams] = useState<UnifiedHistogramFetchParams>();
  const totalAbortRef = useRef<AbortController>();

  useEffect(() => {
    const subscription = fetch$.subscribe(async ({ fetchParams: params }) => {
      setLatestParams(params);

      const timeField = params.dataView?.timeFieldName;
      const indexPattern = params.dataView?.getIndexPattern();
      if (!timeField || !indexPattern) return;

      totalAbortRef.current?.abort();
      const abortController = new AbortController();
      totalAbortRef.current = abortController;

      const interval = computeInterval(params.timeRange, services.data);
      const filter = buildTimeRangeFilter(timeField, params.timeRange);

      const esqlQuery = [
        `FROM ${indexPattern}`,
        `STATS count = COUNT(*) BY bucket = BUCKET(${timeField}, ${interval})`,
        `SORT bucket`,
      ].join(' | ');

      try {
        const { response } = await getESQLResults({
          esqlQuery,
          search,
          signal: abortController.signal,
          timeRange: params.timeRange,
          filter,
        });
        setTotalData(parseHistogramResponse(response));
      } catch {
        // Ignore aborted requests
      }
    });

    return () => {
      subscription.unsubscribe();
      totalAbortRef.current?.abort();
    };
  }, [fetch$, search, services.data]);

  useEffect(() => {
    if (!selectedPattern || !latestParams) {
      setPatternData([]);
      return;
    }

    const timeField = latestParams.dataView?.timeFieldName;
    const indexPattern = latestParams.dataView?.getIndexPattern();
    if (!timeField || !indexPattern) {
      setPatternData([]);
      return;
    }

    const { pattern, categoryField } = selectedPattern;
    const abortController = new AbortController();

    const interval = computeInterval(latestParams.timeRange, services.data);
    const filter = buildTimeRangeFilter(timeField, latestParams.timeRange);

    const esqlQuery = [
      `FROM ${indexPattern}`,
      `WHERE MATCH(${categoryField}, "${pattern}", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})`,
      `STATS count = COUNT(*) BY bucket = BUCKET(${timeField}, ${interval})`,
      `SORT bucket`,
    ].join('\n  | ');

    getESQLResults({
      esqlQuery,
      search,
      signal: abortController.signal,
      timeRange: latestParams.timeRange,
      filter,
    })
      .then(({ response }) => setPatternData(parseHistogramResponse(response)))
      .catch(() => {});

    return () => abortController.abort();
  }, [selectedPattern, latestParams, search, services.data]);

  const remainingData = useMemo(() => {
    if (patternData.length === 0) return totalData;

    const patternMap = new Map(patternData.map((d) => [d.key, d.doc_count]));
    return totalData.map((d) => ({
      key: d.key,
      doc_count: Math.max(0, d.doc_count - (patternMap.get(d.key) ?? 0)),
    }));
  }, [totalData, patternData]);

  return (
    <div ref={setContainerEl} className="unifiedHistogram__chart" css={histogramCss}>
      <EuiSpacer size="m" />
      <Chart size={{ width: '100%', height: containerSize.height }}>
        <Settings
          debugState={window._echDebugStateFlag ?? false}
          showLegend={selectedPattern !== undefined}
          locale={i18n.getLocale()}
        />
        <Axis id="aiops-histogram-left-axis" position={Position.Left} ticks={2} integersOnly />
        <Axis
          id="aiops-histogram-bottom-axis"
          position={Position.Bottom}
          showOverlappingTicks={true}
          tickFormat={(value) => xAxisFormatter.convert(value)}
          labelFormat={() => ''}
        />
        <HistogramBarSeries
          id="remaining_histogram"
          name="All documents"
          xScaleType={ScaleType.Time}
          yScaleType={ScaleType.Linear}
          xAccessor="key"
          yAccessors={['doc_count']}
          data={remainingData}
          stackAccessors={['key']}
        />
        {patternData.length > 0 && (
          <HistogramBarSeries
            id="pattern_histogram"
            name="Pattern"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="key"
            yAccessors={['doc_count']}
            data={patternData}
            stackAccessors={['key']}
            color={euiTheme.colors.vis.euiColorVis8}
          />
        )}
      </Chart>
      <EuiSpacer size="m" />
    </div>
  );
};

export const createChartSection =
  (
    selectedPattern$: BehaviorSubject<SelectedPattern | undefined>
  ): DataSourceProfileProvider['profile']['getChartSectionConfiguration'] =>
  (prev) =>
  (params) => {
    return {
      ...prev(params),
      renderChartSection: (props) => {
        return <PatternChart selectedPattern$={selectedPattern$} chartSectionProps={props} />;
      },
      replaceDefaultChart: true,
    };
  };
