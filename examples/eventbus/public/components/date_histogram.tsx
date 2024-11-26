/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, type FC } from 'react';
import vl from 'vega-lite-api';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import * as vegaTooltip from 'vega-tooltip';

import { EuiBadge } from '@elastic/eui';

import { useEventBusExampleState } from '../hooks/use_event_bus_example_state';
import { useFetchESQL } from '../hooks/use_fetch_esql';

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
  width: number;
  height: number;
}

export const DateHistogram: FC<DateHistogramProps> = (props) => {
  const { field } = props;
  const iframeID = `date_histogram_${field}`;
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);
  const filters = state.useState((s) => s.filters);

  const dispatch = debounce((filter: string) => {
    state.actions.setCrossfilter({ id: iframeID, filter });
  }, 50);

  const esqlWithFilters = useMemo(() => {
    if (esql === '') return null;
    return `${esql} | STATS count = COUNT(*) BY date = BUCKET(${field}, 1, "2024-07-01T00:00:00.000Z", "2024-07-01T23:59:00.000Z")`;
  }, [esql, field]);

  const rawData = useFetchESQL(esqlWithFilters);
  // console.log('date histogram raw data', rawData);

  const [initialized, setInitialized] = React.useState(false);
  const wrapperRef = React.useRef(null);
  const vegaRef = React.useRef(null);
  // Based on this example:
  // https://observablehq.com/@vega/vega-lite-api

  const data = React.useMemo(() => {
    const wideFormatFull = rawData
      ? rawData.values.map((row) => {
          return row.reduce((acc, val, idx) => {
            acc[rawData.columns[idx].name] = val;
            return acc;
          }, {});
        })
      : null;

    if (wideFormatFull === null) {
      return [];
    }

    const crossfilter = wideFormatFull;

    return [
      // crossfilter
      ...crossfilter.map((d) => ({
        ...d,
        type: 'crossfilter',
        typeOrder: 0,
      })),
      // global
      ...wideFormatFull.map((d, i) => ({
        ...d,
        count: d.count - (crossfilter.find((d2) => d2.date === d.date)?.count ?? 0),
        type: 'context',
        typeOrder: 1,
      })),
    ];
  }, [rawData]);

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      // console.log('---- data change', view);
      view.data('table', data);
      view.run();
    }
  }, [data, initialized]);
  // console.log('vegaRef.current', vegaRef.current);

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      view.width(props.width);
      view.height(props.height);
      view.run();
    }
  }, [props.width, props.height, initialized]);

  React.useEffect(() => {
    // setup API options
    const options = {
      config: {
        // Vega-Lite default configuration
      },
      init: (view) => {
        // console.log('init', view);
        vegaRef.current = view;
        // initialize tooltip handler
        view.tooltip(new vegaTooltip.Handler().call);

        view.addSignalListener('brushX', function (event, item) {
          if (item.date) {
            dispatch(
              `WHERE @timestamp >= "${new Date(
                item.date[0]
              ).toISOString()}" AND @timestamp < "${new Date(item.date[1]).toISOString()}"`
            );
          } else {
            dispatch('');
          }
        });

        setInitialized(true);

        view.run();
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
        vl.x().fieldT('date').axis({ title: 'Date', grid: false }),
        vl.y().sum('count'),
        vl
          .color()
          .fieldN('type')
          .scale({ range: ['#ccc', '#00a69b'] })
          .legend({ disable: true }),
        vl.opacity().condition({ test: "datum['type'] == 'context'", value: 0.3 }).value(1),
        vl.order().field('typeOrder'),
        vl.tooltip([vl.fieldT('date'), vl.fieldQ('count')])
      )
      .width(props.width)
      .height(props.height)
      .autosize({ type: 'fit-x' })
      .config({ view: { stroke: null } })
      .params(brush);

    spec.render().then((viewElement) => {
      // render returns a promise to a DOM element containing the chart
      // viewElement.value contains the Vega View object instance
      const el = wrapperRef.current;
      while (el.firstChild) el.removeChild(el.firstChild);
      wrapperRef.current.appendChild(viewElement);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  console.log('filters', filters);

  return (
    <div css={{ position: 'relative' }}>
      {filters[iframeID] && (
        <div css={{ position: 'absolute', bottom: 0 }}>
          <EuiBadge
            iconType="cross"
            iconSide="right"
            iconOnClick={() => state.actions.setCrossfilter({ id: iframeID, filter: '' })}
            iconOnClickAriaLabel="Example of onClick event for icon within the button"
            data-test-sub="crossfilter-badge"
          >
            {truncateString(filters[iframeID], 80)}
          </EuiBadge>
        </div>
      )}
      <div
        ref={wrapperRef}
        id="myChart"
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
