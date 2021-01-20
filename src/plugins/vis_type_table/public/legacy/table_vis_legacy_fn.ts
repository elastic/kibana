/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, Render } from 'src/plugins/expressions/public';
import { tableVisLegacyResponseHandler, TableContext } from './table_vis_legacy_response_handler';
import { TableVisConfig } from '../types';

export type Input = Datatable;

interface Arguments {
  visConfig: string | null;
}

export interface TableVisRenderValue {
  visData: TableContext;
  visType: 'table';
  visConfig: TableVisConfig;
}

export type TableExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'kibana_table',
  Input,
  Arguments,
  Render<TableVisRenderValue>
>;

export const createTableVisLegacyFn = (): TableExpressionFunctionDefinition => ({
  name: 'kibana_table',
  type: 'render',
  inputTypes: ['datatable'],
  help: i18n.translate('visTypeTable.function.help', {
    defaultMessage: 'Table visualization',
  }),
  args: {
    visConfig: {
      types: ['string', 'null'],
      default: '"{}"',
      help: '',
    },
  },
  fn(input, args) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);
    const convertedData = tableVisLegacyResponseHandler(input, visConfig.dimensions);

    return {
      type: 'render',
      as: 'table_vis',
      value: {
        visData: convertedData,
        visType: 'table',
        visConfig,
      },
    };
  },
});
