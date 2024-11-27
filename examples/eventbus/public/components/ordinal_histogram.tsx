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
import vl from 'vega-lite-api';
import * as vega from 'vega';
import * as vegaLite from 'vega-lite';
import * as vegaTooltip from 'vega-tooltip';

import { EuiBadge } from '@elastic/eui';

import type { ESQLSearchResponse } from '@kbn/es-types';

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

interface OrdinalHistogramProps {
  field: string;
  width: number;
  height: number;
}

export const OrdinalHistogram: FC<OrdinalHistogramProps> = (props) => {
  const { field } = props;
  const fieldWithoutKeyword = field.replace(/\./g, '_');
  const iframeID = `ordinal_histogram_${fieldWithoutKeyword}`;
  const state = useEventBusExampleState();
  const esql = state.useState((s) => s.esql);
  const filters = state.useState((s) => s.filters);

  const panelFilters = useMemo(() => {
    const pfs = cloneDeep(filters);
    delete pfs[iframeID];
    return pfs;
  }, [filters, iframeID]);

  const dispatch = debounce((filter: string) => {
    state.actions.setCrossfilter({ id: iframeID, filter });
  }, 50);

  const esqlContext = useMemo(() => {
    if (esql === '') return null;

    const els = esql.split('|').map((d) => d.trim());
    els.push(`STATS count = COUNT(*) BY ${field}`);
    els.push('SORT count DESC');
    els.push('LIMIT 10');

    return els.join('\n| ');
  }, [esql, field]);

  const esqlWithFilters = useMemo(() => {
    if (esql === '') return null;

    const els = esql.split('|').map((d) => d.trim());
    Object.values(panelFilters).forEach((filter) => {
      els.splice(1, 0, `WHERE ${filter}`);
    });

    els.push(`STATS count = COUNT(*) BY ${field}`);
    els.push('SORT count DESC');
    els.push('LIMIT 10');

    return els.join('\n| ');
  }, [esql, field, panelFilters]);

  const rawDataContext = useFetchESQL(esqlContext);
  const rawDataWithFilters = useFetchESQL(esqlWithFilters);

  const [initialized, setInitialized] = React.useState(false);
  const wrapperRef = React.useRef(null);
  const vegaRef = React.useRef(null);
  // Based on this example:
  // https://observablehq.com/@vega/vega-lite-api

  const data = React.useMemo(() => {
    function transformData(rawData: ESQLSearchResponse) {
      return rawData.values.map((row) => {
        return row.reduce((acc, val, idx) => {
          acc[rawData.columns[idx].name.replace(/\./g, '_')] = val;
          return acc;
        }, {});
      });
    }

    const wideFormatFull = rawDataContext ? transformData(rawDataContext) : null;
    const crossfilter = rawDataWithFilters ? transformData(rawDataWithFilters) : null;

    if (wideFormatFull === null || crossfilter === null) {
      return [];
    }

    console.log('wideFormatFull', wideFormatFull);

    return [
      // crossfilter
      ...crossfilter.map((d) => ({
        ...d,
        type: '01_filter',
      })),
      // global
      ...wideFormatFull.map((d, i) => ({
        ...d,
        count:
          d.count -
          (crossfilter.find((d2) => d2[fieldWithoutKeyword] === d[fieldWithoutKeyword])?.count ??
            0),
        type: '02_context',
      })),
    ];
  }, [rawDataContext, rawDataWithFilters]);

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      // console.log('---- data change', view);
      view.data('table', data);
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 1);
    }
  }, [data, initialized]);

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

        view.addSignalListener('ordinal_listener', function (event, item) {
          if (item[fieldWithoutKeyword]) {
            dispatch(`${field}=="${item[fieldWithoutKeyword]}"`);
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

    const click = vl.selectMulti().encodings('y').name('ordinal_listener');

    // now you can use the API!
    const spec = vl
      .markBar({ tooltip: true })
      .data({ name: 'table' })
      .encode(
        // https://vega.github.io/vega-lite/docs/timeunit.html
        vl.x().sum('count').axis({ title: '' }),
        vl.y().fieldN(fieldWithoutKeyword).sort('-x').axis({ title: '' }),
        vl
          .color()
          .fieldN('type')
          .scale({ range: ['#00a69b', '#ccc'] })
          .legend({ disable: true }),
        vl
          .opacity()
          .condition([
            {
              test: `datum['type'] == '02_context'`,
              empty: false,
              value: 0.7,
            },
            {
              param: `ordinal_listener`,
              empty: false,
              value: 0.7,
            },
          ])
          .value(1),
        vl.tooltip([vl.fieldN(fieldWithoutKeyword), vl.fieldQ('count')])
      )
      .title({ text: field, anchor: 'start' })
      .width('container')
      .height(props.height - 15)
      .config({ view: { stroke: null } })
      .params(click);

    spec.render().then((viewElement) => {
      // render returns a promise to a DOM element containing the chart
      // viewElement.value contains the Vega View object instance
      const el = wrapperRef.current;
      while (el.firstChild) el.removeChild(el.firstChild);
      wrapperRef.current.appendChild(viewElement);
    });

    return () => {
      state.actions.setCrossfilter({ id: iframeID, filter: '' });
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        style={{
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
