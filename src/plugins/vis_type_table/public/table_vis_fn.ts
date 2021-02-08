/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, Datatable, Render } from '../../expressions/public';
import { TableVisData, TableVisConfig } from './types';
import { VIS_TYPE_TABLE } from '../common';
import { tableVisResponseHandler } from './utils';

export type Input = Datatable;

interface Arguments {
  visConfig: string | null;
}

export interface TableVisRenderValue {
  visData: TableVisData;
  visType: typeof VIS_TYPE_TABLE;
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
  fn(input, args, handlers) {
    const visConfig = args.visConfig && JSON.parse(args.visConfig);
    const convertedData = tableVisResponseHandler(input, visConfig);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', input);
    }
    return {
      type: 'render',
      as: 'table_vis',
      value: {
        visData: convertedData,
        visType: VIS_TYPE_TABLE,
        visConfig,
      },
    };
  },
});
