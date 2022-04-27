/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Datatable, PointSeriesColumnNames } from '@kbn/expressions-plugin';
import { DataLayerFn, DataLayerArgs } from '../types';
import { DATA_LAYER, LayerTypes } from '../constants';
import { strings } from '../i18n';
import { commonDataLayerArgs } from './common_data_layer_args';

export function getAccessors(args: DataLayerArgs, table: Datatable) {
  let splitAccessor = args.splitAccessor;
  let xAccessor = args.xAccessor;
  let accessors = args.accessors ?? [];
  if (!splitAccessor && !xAccessor && !(accessors && accessors.length)) {
    const y = table.columns.find((column) => column.id === PointSeriesColumnNames.Y)?.id;
    xAccessor = table.columns.find((column) => column.id === PointSeriesColumnNames.X)?.id;
    splitAccessor = table.columns.find((column) => column.id === PointSeriesColumnNames.COLOR)?.id;
    accessors = y ? [y] : [];
  }

  return { splitAccessor, xAccessor, accessors };
}

export const dataLayerFunction: DataLayerFn = {
  name: DATA_LAYER,
  aliases: [],
  type: DATA_LAYER,
  help: strings.getDataLayerFnHelp(),
  inputTypes: ['datatable'],
  args: { ...commonDataLayerArgs },
  fn(table, args) {
    return {
      type: DATA_LAYER,
      ...args,
      ...getAccessors(args, table),
      layerType: LayerTypes.DATA,
      table,
    };
  },
};
