/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { validateAccessor } from '@kbn/visualizations-plugin/common/utils';
import { LayerTypes, REFERENCE_LINE_LAYER } from '../constants';
import { ReferenceLineLayerFn } from '../types';

export const referenceLineLayerFn: ReferenceLineLayerFn['fn'] = async (input, args, handlers) => {
  const table = args.table ?? input;
  const accessors = args.accessors ?? [];
  accessors.forEach((accessor) => validateAccessor(accessor, table.columns));

  return {
    type: REFERENCE_LINE_LAYER,
    ...args,
    layerType: LayerTypes.REFERENCELINE,
    table: args.table ?? input,
  };
};
