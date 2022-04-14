/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import Datasource from '../../lib/classes/datasource';
import buildRequest from './lib/build_request';
import toSeriesList from './lib/agg_response_to_series_list';

function getRequestAbortedSignal(aborted$) {
  const controller = new AbortController();
  aborted$.subscribe(() => controller.abort());
  return controller.signal;
}

export default new Datasource('es', {
  hideFitArg: true,
  args: [
    {
      name: 'q',
      types: ['string', 'null'],
      multi: true,
      help: i18n.translate('timelion.help.functions.es.args.qHelpText', {
        defaultMessage: 'Query in lucene query string syntax',
      }),
    },
    {
      name: 'metric',
      types: ['string', 'null'],
      multi: true,
      help: i18n.translate('timelion.help.functions.es.args.metricHelpText', {
        defaultMessage:
          'An elasticsearch metric agg: avg, sum, min, max, percentiles or cardinality, followed by a field. ' +
          'E.g., "sum:bytes", "percentiles:bytes:95,99,99.9" or just "count"',
        description:
          `avg, sum, min, max, percentiles and cardinality are keywords in the expression ` +
          `and must not be translated. Also don't translate the examples.`,
      }),
    },
    {
      name: 'split',
      types: ['string', 'null'],
      multi: true,
      help: i18n.translate('timelion.help.functions.es.args.splitHelpText', {
        defaultMessage:
          'An elasticsearch field to split the series on and a limit. E.g., "{hostnameSplitArg}" to get the top 10 hostnames',
        values: {
          hostnameSplitArg: 'hostname:10',
        },
      }),
    },
    {
      name: 'index',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.es.args.indexHelpText', {
        defaultMessage:
          'Index to query, wildcards accepted. Provide Index Pattern name for scripted fields and ' +
          'field name type ahead suggestions for metrics, split, and timefield arguments.',
        description:
          '"metrics", "split" and "timefield" are referring to parameter names and should not be translated.',
      }),
    },
    {
      name: 'timefield',
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.es.args.timefieldHelpText', {
        defaultMessage: 'Field of type "date" to use for x-axis',
        description: '"date" is a field type and should not be translated.',
      }),
    },
    {
      name: 'kibana',
      types: ['boolean', 'null'],
      help: i18n.translate('timelion.help.functions.es.args.kibanaHelpText', {
        defaultMessage:
          'Respect filters on Kibana dashboards. Only has an effect when using on Kibana dashboards',
      }),
    },
    {
      name: 'interval', // You really shouldn't use this, use the interval picker instead
      types: ['string', 'null'],
      help: i18n.translate('timelion.help.functions.es.args.intervalHelpText', {
        defaultMessage: `**DO NOT USE THIS**. It's fun for debugging fit functions, but you really should use the interval picker`,
      }),
    },
  ],
  help: i18n.translate('timelion.help.functions.esHelpText', {
    defaultMessage: 'Pull data from an elasticsearch instance',
  }),
  aliases: ['elasticsearch'],
  fn: async function esFn(args, tlConfig) {
    const config = _.defaults(_.clone(args.byName), {
      q: '*',
      metric: ['count'],
      index: tlConfig.settings['timelion:es.default_index'],
      timefield: tlConfig.settings['timelion:es.timefield'],
      interval: tlConfig.time.interval,
      kibana: true,
      fit: 'nearest',
    });
    const indexPatternsService = tlConfig.getIndexPatternsService();
    const indexPatternSpec = (await indexPatternsService.find(config.index)).find(
      (index) => index.title === config.index
    );

    const { scriptFields = {}, runtimeFields = {} } = indexPatternSpec?.getComputedFields() ?? {};
    const esShardTimeout = tlConfig.esShardTimeout;

    const body = buildRequest(config, tlConfig, scriptFields, runtimeFields, esShardTimeout);

    // User may abort the request without waiting for the results
    // we need to handle this scenario by aborting underlying server requests
    const abortSignal = getRequestAbortedSignal(tlConfig.request.events.aborted$);

    const searchContext = await tlConfig.context.search;
    const resp = await searchContext
      .search(
        body,
        {
          ...tlConfig.request?.body.searchSession,
        },
        { ...tlConfig.context, abortSignal }
      )
      .toPromise();

    if (!resp.rawResponse._shards.total) {
      throw new Error(
        i18n.translate('timelion.serverSideErrors.esFunction.indexNotFoundErrorMessage', {
          defaultMessage: 'Elasticsearch index not found: {index}',
          values: {
            index: config.index,
          },
        })
      );
    }
    return {
      type: 'seriesList',
      list: toSeriesList(resp.rawResponse.aggregations, config),
    };
  },
});
