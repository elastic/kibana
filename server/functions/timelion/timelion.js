import Fn from '../../../common/functions/fn.js';
//import { buildESRequest } from '../esdocs/lib/build_es_request';
import fetch from 'axios';

export default new Fn({
  name: 'timelion',
  context: {
    types: ['filter'],
  },
  args: {
    q: {
      types: ['string'],
      aliases: ['query'],
      help: 'A timelion query',
      default: '.es(*)',
    },
    interval: {
      types: ['string'],
      help: 'Bucket interval for the time series',
      default: 'auto',
    },
    filter: {
      types: ['filter', 'null'],
      help:
        'Timelion requires at least a time filter with a beginning and end (see the timefilter function).' +
        'Adding a timefilter element to your workpad will also work. This local filter wins if both are present.',
    },
  },
  type: 'datatable',
  help:
    'Use timelion to extract one or more timeseries from Elasticsearch and other backends. ' +
    'Note that styling related settings will not be preserved',
  fn: (context, args, handlers) => {
    console.log(handlers.serverUri);

    // TODO: Find time range, or just request a giant single bucket?

    return fetch(`${handlers.serverUri}/api/timelion/run`, {
      method: 'POST',
      responseType: 'json',
      headers: {
        'kbn-xsrf': 'lollerpops',
        ...handlers.httpHeaders,
      },
      data: {
        sheet: [args.q],
        time: {
          from: 'now-1y',
          to: 'now',
          interval: 'auto',
          timezone: 'America/Phoenix',
        },
      },
    }).then(resp => {

      console.log(resp.data.sheet[0].list);
      return;
      return {
        type: 'datatable',
        rows: resp,
      };
    });
  },
});
