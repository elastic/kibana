/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataLayerFn } from '../types';
import { DATA_LAYER } from '../constants';
import { strings } from '../i18n';
import { commonDataLayerArgs } from './common_data_layer_args';

export const dataLayerFunction: DataLayerFn = {
  name: DATA_LAYER,
  aliases: [],
  type: DATA_LAYER,
  help: strings.getDataLayerFnHelp(),
  inputTypes: ['datatable'],
  args: { ...commonDataLayerArgs },
  async fn(table, args, context) {
    const { dataLayerFn } = await import('./data_layer_fn');
    return await dataLayerFn(table, args, context);
  },
};
