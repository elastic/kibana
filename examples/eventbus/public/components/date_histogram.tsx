/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';
import { cloneDeep } from 'lodash';
import * as vl from 'vega-lite-api';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import * as vegaTooltip from 'vega-tooltip';

import { EuiBadge } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

import { EsqlPopover } from './esql_popover';

const height = 120;

function truncateString(str: string, n: number) {
  // Check if the string length exceeds the limit
  if (str.length > n) {
    // Truncate and append "..."
    return str.slice(0, n) + '...';
  }
  // Return the original string if it's within the limit
  return str;
}

const debounce = (callback, wait) => {
  let timeoutId = null;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback.apply(null, args);
    }, wait);
  };
};

interface DateHistogramProps {
  field: string;
}

export const DateHistogram: FC<DateHistogramProps> = ({ field }) => {
  const iframeID = `date_histogram_${field}`;
  const state = useEventBusExampleState();
  const esql = state.useEventBusState((s) => s.esql);
  const filters = state.useEventBusState((s) => s.filters);
  const width = state.useEventBusState((s) => s.chartWidth);

  const panelFilters = useMemo(() => {
    const pfs = cloneDeep(filters);
    delete pfs[iframeID];
    return pfs;
  }, [filters, iframeID]);

  const dispatch = debounce((filter: string) => {
    state.actions.setFilter({ id: iframeID, filter });
  }, 50);

  const rangeEsqlWithFilters = useMemo(() => {
    if (esql === '') return null;

    const els = esql.split('|').map((d) => d.trim());
    els.push(`STATS min = MIN(${field}),max = MAX(${field})`);

    return els.join('\n| ');
  }, [esql, field]);

  const rangeDataWithFilters = useFetchESQL(rangeEsqlWithFilters);

  const bucketCount = useMemo(() => {
    if (!rangeDataWithFilters) return null;

    const min = rangeDataWithFilters.values[0][0];
    const max = rangeDataWithFilters.values[0][1];

    const diff = new Date(max).getTime() - new Date(min).getTime();

    const buckets = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (buckets === 1) return 24 * 60;
    return buckets > 5 ? 1 : 24;
  }, [rangeDataWithFilters]);

  const esqlWithFilters = useMemo(() => {
    if (esql === '' || bucketCount === null) return null;

    const els = esql.split('|').map((d) => d.trim());

    if (Object.values(panelFilters).length === 0) {
      els.push(
        `STATS count = COUNT(*), context = COUNT(*) WHERE ${field}=="1970-01-01T00:00:00.000Z", total = COUNT(*) BY date = BUCKET(${field}, ${bucketCount}, "2024-07-01T00:00:00.000Z", "2024-07-01T23:59:00.000Z")`
      );
    } else {
      const filter = Object.values(panelFilters).join(' AND ');
      els.push(
        `STATS count = COUNT(*) WHERE ${filter}, context = COUNT(*) WHERE NOT(${filter}), total = COUNT(*) BY date = BUCKET(${field}, ${bucketCount}, "2024-07-01T00:00:00.000Z", "2024-07-01T23:59:00.000Z")`
      );
    }

    return els.join('\n| ');
  }, [bucketCount, esql, field, panelFilters]);

  const rawDataWithFilters = useFetchESQL(esqlWithFilters);

  const [initialized, setInitialized] = React.useState(false);
  const wrapperRef = React.useRef(null);
  const vegaRef = React.useRef(null);
  // Based on this example:
  // https://observablehq.com/@vega/vega-lite-api

  const data = React.useMemo(() => {
    if (!rawDataWithFilters) {
      return null;
    }

    const longFormat = rawDataWithFilters.values.reduce((acc, val, idx) => {
      acc.push({
        date: val[3],
        count: val[0],
        type: 'crossfilter',
      });
      acc.push({
        date: val[3],
        count: val[1],
        type: 'context',
      });
      return acc;
    }, []);

    return longFormat;
  }, [rawDataWithFilters]);

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      // console.log('---- rerender date histogram', props.width, props.height);
      view.data('table', data);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1);
    }
  }, [data, initialized]);
  // console.log('vegaRef.current', vegaRef.current);

  React.useEffect(() => {
    // setup API options
    const options = {
      config: {
        // Vega-Lite default configuration
      },
      init: (view) => {
        vegaRef.current = view;
        // initialize tooltip handler
        view.tooltip(new vegaTooltip.Handler().call);

        view.addSignalListener('brushX', function (event, item) {
          if (item.date) {
            dispatch(
              `${field} >= "${new Date(item.date[0]).toISOString()}" AND ${field} < "${new Date(
                item.date[1]
              ).toISOString()}"`
            );
          } else {
            dispatch('');
          }
        });

        setInitialized(true);
      },
      view: {
        renderer: 'canvas',
      },
    };

    // register vega and vega-lite with the API
    vl.register(vega, vegaLite, options);

    const brush = vl.selectInterval().name('brushX').encodings('x');

    // now you can use the API!
    const spec = vl
      .markBar({ tooltip: true, width: 15 })
      .data({ name: 'table' })
      .encode(
        // https://vega.github.io/vega-lite/docs/timeunit.html
        vl.x().fieldT('date').axis({ title: '', grid: false }),
        vl.y().sum('count').axis({ title: '' }),
        vl
          .color()
          .fieldN('type')
          .scale({ range: ['#ccc', '#00a69b'] })
          .legend({ disable: true }),
        vl.opacity().condition({ test: "datum['type'] == 'context'", value: 0.7 }).value(1),
        vl.order().field('typeOrder'),
        vl.tooltip([vl.fieldT('date'), vl.fieldQ('count')])
      )
      .title({ text: field, anchor: 'start' })
      .width('container')
      .height(height - 50)
      .config({ view: { stroke: null } })
      .params(brush);

    spec.render().then((viewElement) => {
      // render returns a promise to a DOM element containing the chart
      // viewElement.value contains the Vega View object instance
      const el = wrapperRef.current;
      while (el.firstChild) el.removeChild(el.firstChild);
      wrapperRef.current.appendChild(viewElement);
    });

    return () => {
      state.actions.setFilter({ id: iframeID, filter: '' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // console.log('filters', filters);

  return (
    <div css={{ position: 'relative' }}>
      {esqlWithFilters !== null && <EsqlPopover esql={esqlWithFilters} />}
      {filters[iframeID] && (
        <div css={{ position: 'absolute', bottom: 0 }}>
          <EuiBadge
            iconType="cross"
            iconSide="right"
            iconOnClick={() => state.actions.setFilter({ id: iframeID, filter: '' })}
            iconOnClickAriaLabel="Example of onClick event for icon within the button"
            data-test-sub="crossfilter-badge"
          >
            {truncateString(filters[iframeID], 80)}
          </EuiBadge>
        </div>
      )}
      <div
        ref={wrapperRef}
        style={{
          width,
          height,
        }}
      />
    </div>
  );
};
