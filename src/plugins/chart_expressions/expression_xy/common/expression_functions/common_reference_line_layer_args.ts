/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EXTENDED_Y_CONFIG } from '../constants';
import { strings } from '../i18n';
import { ReferenceLineLayerFn, ExtendedReferenceLineLayerFn } from '../types';

type CommonReferenceLineLayerFn = ReferenceLineLayerFn | ExtendedReferenceLineLayerFn;

export const commonReferenceLineLayerArgs: Omit<CommonReferenceLineLayerFn['args'], 'table'> = {
  accessors: {
    types: ['string'],
    help: strings.getRLAccessorsHelp(),
    multi: true,
  },
  yConfig: {
    types: [EXTENDED_Y_CONFIG],
    help: strings.getRLYConfigHelp(),
    multi: true,
  },
  columnToLabel: {
    types: ['string'],
    help: strings.getColumnToLabelHelp(),
  },
};
