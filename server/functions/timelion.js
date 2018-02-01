import fetch from 'axios';
import { flatten } from 'lodash';
import { buildBoolArray } from './esdocs/lib/build_bool_array';

export const timelion = () => ({
  name: 'timelion',
  context: {
    types: ['filter'],
  },
  args: {
    _: {
      types: ['string'],
      aliases: ['query', 'q'],
      help: 'A timelion query',
      default: '".es(*)"',
    },
    interval: {
      types: ['string'],
      help: 'Bucket interval for the time series',
      default: 'auto',
    },
    from: {
      type: ['string'],
      help: 'Elasticsearch date math string for the start of the time range',
    },
    to: {
      type: ['string'],
      help: 'Elasticsearch date math string for the end of the time range',
    },
  },
  type: 'datatable',
  help: 'Use timelion to extract one or more timeseries from many sources.',
  fn: (context, args, handlers) => {
    function findTimeRangeInFilterContext() {
      const timeFilter = context.and.find(and => and.type === 'time');
      if (!timeFilter) throw new Error('No time filter found');
      return { from: timeFilter.from, to: timeFilter.to };
    }

    const range = (() => {
      const defaultRange = { from: args.from || 'now-1y', to: args.to || 'now' };

      try {
        return { ...defaultRange, ...findTimeRangeInFilterContext() };
      } catch (e) {
        return defaultRange;
      }
    })();

    const body = {
      extended: {
        es: {
          filter: {
            bool: {
              must: buildBoolArray(context.and),
            },
          },
        },
      },
      sheet: [args._],
      time: {
        from: range.from,
        to: range.to,
        interval: args.interval,
        timezone: 'America/Phoenix',
      },
    };

    return fetch(`${handlers.serverUri}/api/timelion/run`, {
      method: 'POST',
      responseType: 'json',
      headers: {
        'kbn-xsrf': 'lollerpops',
        ...handlers.httpHeaders,
      },
      data: body,
    }).then(resp => {
      const seriesList = resp.data.sheet[0].list;

      const rows = flatten(
        seriesList.map(series =>
          series.data.map(row => ({ '@timestamp': row[0], value: row[1], label: series.label }))
        )
      );

      return {
        type: 'datatable',
        columns: [
          { name: '@timestamp', type: 'date' },
          { name: 'value', type: 'number' },
          { name: 'label', type: 'string' },
        ],
        rows: rows,
      };
    });
  },
});
