/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EVENT_OUTCOME_FIELD,
  SERVICE_NAME_FIELD,
  SPAN_DURATION_FIELD,
  SPAN_NAME_FIELD,
  TIMESTAMP_FIELD,
  TRANSACTION_DURATION_FIELD,
  TRANSACTION_NAME_FIELD,
} from '../../../../../../common/data_types/logs/constants';
import { DataSourceCategory, type DataSourceProfileProvider } from '../../../../profiles';
import { extendProfileProvider } from '../../../extend_profile_provider';
import { extractIndexPatternFrom } from '../../../extract_index_pattern_from';
import { reContainsTracesApm, reContainsTracesOtel } from './reg_exps';
import { getModifiedVisAttributes } from '../get_modified_vis_attrivutes';

export const createTracesAPMDataSourceProfileProvider = (
  tracesDataSourceProfileProvider: DataSourceProfileProvider
): DataSourceProfileProvider => {
  const resolve: DataSourceProfileProvider['resolve'] = async (params) => {
    const baseResult = await tracesDataSourceProfileProvider.resolve(params);
    if (!baseResult.isMatch) {
      return baseResult;
    }
    const indexPattern = extractIndexPatternFrom(params);

    const isOtelIndexPattern = reContainsTracesOtel.test(indexPattern || '');
    const isApmIndexPattern = reContainsTracesApm.test(indexPattern || '');

    // Avoid mixing APM and OTEL columns in the same profile
    if (isApmIndexPattern && !isOtelIndexPattern) {
      return {
        isMatch: true,
        context: { category: DataSourceCategory.Traces },
      };
    }

    return { isMatch: false };
  };

  return extendProfileProvider(tracesDataSourceProfileProvider, {
    profileId: 'observability-traces-apm-data-source-profile',
    profile: {
      getDefaultAppState: () => () => {
        return {
          columns: [
            { name: TIMESTAMP_FIELD, width: 212 },
            { name: SERVICE_NAME_FIELD },
            { name: TRANSACTION_NAME_FIELD },
            { name: SPAN_NAME_FIELD },
            { name: TRANSACTION_DURATION_FIELD },
            { name: SPAN_DURATION_FIELD },
            { name: EVENT_OUTCOME_FIELD },
          ],
          rowHeight: 1,
        };
      },
      getModifiedVisAttributes: (prev) => (params) => {
        const prevAttributes = prev(params);

        const esql =
          'esql' in prevAttributes.state.query ? prevAttributes.state.query.esql : undefined;
        // for now, just show heatmap when esql mode
        if (!esql) {
          return prevAttributes;
        }
        const commands = esql.split('|').map((command) => command.trim());
        const from = commands[0];
        const timestampDateTruncCommand = commands.find((command) =>
          command.startsWith('EVAL timestamp=DATE_TRUNC')
        );
        const whereCommands = commands.filter((command) => command.startsWith('WHERE'));

        const heatmapQuery = `${from}
      | ${timestampDateTruncCommand}
       ${whereCommands.length ? `| ${whereCommands.join('\n |')}` : ''}
        | EVAL duration = COALESCE(span.duration.us, transaction.duration.us)
        | EVAL duration_ms = FLOOR(duration / 1000)
        | EVAL duration_bucket = FLOOR(duration_ms / 1000) * 1000
        | DROP duration, duration_ms
        | STATS results = COUNT(*) BY timestamp, duration_bucket
        | SORT duration_bucket DESC, timestamp ASC
      `;
        return getModifiedVisAttributes(heatmapQuery, prevAttributes);
      },
    },
    resolve,
  });
};
