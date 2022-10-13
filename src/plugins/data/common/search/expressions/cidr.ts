/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';

export interface Cidr {
  mask: string;
}

export type CidrOutput = ExpressionValueBoxed<'cidr', Cidr>;

export type ExpressionFunctionCidr = ExpressionFunctionDefinition<'cidr', null, Cidr, CidrOutput>;

export const cidrFunction: ExpressionFunctionCidr = {
  name: 'cidr',
  type: 'cidr',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.cidr.help', {
    defaultMessage: 'Create a CIDR-based range',
  }),
  args: {
    mask: {
      types: ['string'],
      required: true,
      help: i18n.translate('data.search.functions.cidr.cidr.help', {
        defaultMessage: 'Specify the CIDR block',
      }),
    },
  },

  fn(input, { mask }) {
    return {
      mask,
      type: 'cidr',
    };
  },
};
