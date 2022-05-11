/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LayerTypes, REFERENCE_LINE } from '../constants';
import { ReferenceLineFn } from '../types';
import { strings } from '../i18n';

export const referenceLineFunction: ReferenceLineFn = {
  name: REFERENCE_LINE,
  aliases: [],
  type: REFERENCE_LINE,
  help: strings.getRLHelp(),
  inputTypes: ['datatable'],
  args: {},
  fn(table, args) {
    return {
      type: REFERENCE_LINE,
      layerType: LayerTypes.REFERENCELINE,
      table,
    };
  },
};
