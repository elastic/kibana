/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import type { ICommandMethods } from '../../registry';
import { autocomplete } from './autocomplete';
import type { ICommandContext } from '../../types';

const timeseriesCommandMethods: ICommandMethods<ICommandContext> = {
  autocomplete,
};

export const timeseriesCommand = {
  name: 'ts',
  methods: timeseriesCommandMethods,
  metadata: {
    hidden: true,
    description: i18n.translate('kbn-esql-ast.esql.definitions.metricsDoc', {
      defaultMessage:
        'A metrics-specific source command, use this command to load data from TSDB indices. ' +
        'Similar to STATS command on can calculate aggregate statistics, such as average, count, and sum, over the incoming search results set. ' +
        'When used without a BY clause, only one row is returned, which is the aggregation over the entire incoming search results set. ' +
        'When you use a BY clause, one row is returned for each distinct value in the field specified in the BY clause. ' +
        'The command returns only the fields in the aggregation, and you can use a wide range of statistical functions with the stats command. ' +
        'When you perform more than one aggregation, separate each aggregation with a comma.',
    }),
    declaration: '',
    examples: ['TS index', 'TS index, index2'],
  },
};
