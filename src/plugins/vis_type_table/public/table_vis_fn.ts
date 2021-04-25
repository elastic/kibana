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

export interface TableVisRenderValue {
  visData: TableVisData;
  visType: typeof VIS_TYPE_TABLE;
  visConfig: TableVisConfig;
}

export type TableExpressionFunctionDefinition = ExpressionFunctionDefinition<
  'kibana_table',
  Datatable,
  TableVisConfig,
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
    metrics: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTable.function.args.metricsHelpText', {
        defaultMessage: 'Metrics dimensions config',
      }),
      required: true,
      multi: true,
    },
    buckets: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTable.function.args.bucketsHelpText', {
        defaultMessage: 'Buckets dimensions config',
      }),
      multi: true,
    },
    splitColumn: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTable.function.args.splitColumnHelpText', {
        defaultMessage: 'Split by column dimension config',
      }),
    },
    splitRow: {
      types: ['vis_dimension'],
      help: i18n.translate('visTypeTable.function.args.splitRowHelpText', {
        defaultMessage: 'Split by row dimension config',
      }),
    },
    percentageCol: {
      types: ['string'],
      help: i18n.translate('visTypeTable.function.args.percentageColHelpText', {
        defaultMessage: 'Name of column to show percentage for',
      }),
      default: '',
    },
    perPage: {
      types: ['number'],
      default: '',
      help: i18n.translate('visTypeTable.function.args.perPageHelpText', {
        defaultMessage: 'The number of rows at a table page is used for pagination',
      }),
    },
    row: {
      types: ['boolean'],
      help: i18n.translate('visTypeTable.function.args.rowHelpText', {
        defaultMessage: 'Row value is used for split table mode. Set to "true" to split by row',
      }),
    },
    showPartialRows: {
      types: ['boolean'],
      help: '',
      default: false,
    },
    showMetricsAtAllLevels: {
      types: ['boolean'],
      help: '',
      default: false,
    },
    showToolbar: {
      types: ['boolean'],
      help: i18n.translate('visTypeTable.function.args.showToolbarHelpText', {
        defaultMessage: `Set to "true" to show grid's toolbar with "Export" button`,
      }),
      default: false,
    },
    showTotal: {
      types: ['boolean'],
      help: i18n.translate('visTypeTable.function.args.showTotalHelpText', {
        defaultMessage: 'Set to "true" to show the total row',
      }),
      default: false,
    },
    title: {
      types: ['string'],
      help: i18n.translate('visTypeTable.function.args.titleHelpText', {
        defaultMessage:
          'The visualization title. The title is used for CSV export as a default file name',
      }),
    },
    totalFunc: {
      types: ['string'],
      help: i18n.translate('visTypeTable.function.args.totalFuncHelpText', {
        defaultMessage: 'Specifies calculating function for the total row. Possible options are: ',
      }),
    },
  },
  fn(input, args, handlers) {
    const convertedData = tableVisResponseHandler(input, args);

    if (handlers?.inspectorAdapters?.tables) {
      handlers.inspectorAdapters.tables.logDatatable('default', input);
    }
    return {
      type: 'render',
      as: 'table_vis',
      value: {
        visData: convertedData,
        visType: VIS_TYPE_TABLE,
        visConfig: args,
      },
    };
  },
});
