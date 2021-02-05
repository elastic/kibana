/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { tableVisResponseHandler, TableContext } from './table_vis_response_handler';
import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { TableVisConfig } from './types';

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

export const createTableVisFn = (): TableExpressionFunctionDefinition => ({
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
    const convertedData = tableVisResponseHandler(input, visConfig.dimensions);

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
