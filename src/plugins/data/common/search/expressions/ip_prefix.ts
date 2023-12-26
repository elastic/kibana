/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';

export interface IpPrefix {
  prefixLength?: number;
  isIpv6?: boolean;
}

export type IpPrefixOutput = ExpressionValueBoxed<'ip_prefix', IpPrefix>;

export type ExpressionFunctionIpPrefix = ExpressionFunctionDefinition<
  'ipPrefix',
  null,
  IpPrefix,
  IpPrefixOutput
>;

export const ipPrefixFunction: ExpressionFunctionIpPrefix = {
  name: 'ipPrefix',
  type: 'ip_prefix',
  inputTypes: ['null'],
  help: i18n.translate('data.search.functions.ipPrefix.help', {
    defaultMessage: 'Create extended bounds',
  }),
  args: {
    prefixLength: {
      types: ['number'],
      help: i18n.translate('data.search.functions.ipPrefix.prefixLength.help', {
        defaultMessage: 'Specify the lower boundary value',
      }),
    },
    isIpv6: {
      types: ['boolean'],
      help: i18n.translate('data.search.functions.ipPrefix.isIpv6.help', {
        defaultMessage: 'Specify the upper boundary value',
      }),
    },
  },

  fn(input, { prefixLength, isIpv6 }) {
    return {
      type: 'ip_prefix',
      prefixLength,
      isIpv6,
    };
  },
};
