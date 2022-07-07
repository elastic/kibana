/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { strings } from '../i18n';
import { DataDecorationConfigFn, ReferenceLineDecorationConfigFn } from '../types';

type CommonDecorationConfigFn = DataDecorationConfigFn | ReferenceLineDecorationConfigFn;

export const commonDecorationConfigArgs: CommonDecorationConfigFn['args'] = {
  forAccessor: {
    types: ['string'],
    help: strings.getForAccessorHelp(),
  },
  axisId: {
    types: ['string'],
    help: strings.getAxisIdHelp(),
  },
  color: {
    types: ['string'],
    help: strings.getColorHelp(),
  },
};
