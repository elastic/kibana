/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { YAxisModes } from '../constants';
import { strings } from '../i18n';
import { YConfigFn, ExtendedYConfigFn } from '../types';

type CommonYConfigFn = YConfigFn | ExtendedYConfigFn;

export const commonYConfigArgs: Pick<
  CommonYConfigFn['args'],
  'forAccessor' | 'axisMode' | 'color'
> = {
  forAccessor: {
    types: ['string'],
    help: strings.getForAccessorHelp(),
  },
  axisMode: {
    types: ['string'],
    options: [...Object.values(YAxisModes)],
    help: strings.getAxisModeHelp(),
    strict: true,
  },
  color: {
    types: ['string'],
    help: strings.getColorHelp(),
  },
};
