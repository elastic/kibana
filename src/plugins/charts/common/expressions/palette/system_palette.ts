/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../expressions';
import type { PaletteOutput } from './types';
import { paletteIds } from '../../constants';

export interface SystemPaletteArguments {
  name: string;
}

export function systemPalette(): ExpressionFunctionDefinition<
  'system_palette',
  null,
  SystemPaletteArguments,
  PaletteOutput
> {
  return {
    name: 'system_palette',
    aliases: [],
    type: 'palette',
    inputTypes: ['null'],
    help: i18n.translate('charts.functions.systemPaletteHelpText', {
      defaultMessage: 'Creates a dynamic color palette.',
    }),
    args: {
      name: {
        types: ['string'],
        help: i18n.translate('charts.functions.systemPalette.args.nameHelpText', {
          defaultMessage: 'Name of the palette in the palette list',
        }),
        options: paletteIds,
      },
    },
    fn: (input, args) => {
      return {
        type: 'palette',
        name: args.name,
      };
    },
  };
}
