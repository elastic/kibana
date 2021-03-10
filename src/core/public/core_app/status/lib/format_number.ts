/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import numeral from '@elastic/numeral';

export type DataType = 'byte' | 'float' | 'integer' | 'time';

export function formatNumber(num: number, type?: DataType) {
  let format: string;
  let postfix = '';
  switch (type) {
    case 'byte':
      format = '0.00 b';
      break;
    case 'time':
      format = '0.00';
      postfix = ' ms';
      break;
    case 'integer':
      format = '0';
      break;
    case 'float':
    default:
      format = '0.00';
  }

  return numeral(num).format(format) + postfix;
}
