/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';

export const getStepIconType = (stepType: string) => {
  let iconType: EuiIconType = 'info';
  switch (stepType) {
    case 'http':
      iconType = 'globe';
      break;
    case 'console':
      iconType = 'console';
      break;
    case 'slack':
      iconType = 'logoSlack';
      break;
    case 'inference.completion':
    case 'inference.unified_inference':
      iconType = 'sparkles';
      break;
    case 'manual':
      iconType = 'accessibility';
      break;
    case 'alert':
      iconType = 'warning';
      break;
    case 'scheduled':
      iconType = 'clock';
      break;
    case 'wait':
      iconType = 'clock';
      break;
    case 'enter-if':
    case 'exit-if':
    case 'enter-condition-branch':
    case 'exit-condition-branch':
    case 'if':
      iconType = 'branch';
      break;
    case 'enter-foreach':
    case 'foreach':
      iconType = 'refresh';
      break;
    case 'foreach-iteration':
      iconType = 'tokenNumber';
      break;

    case 'if-branch':
      iconType = 'tokenBoolean';
      break;
    default:
      iconType = 'info';
      break;
  }
  return iconType;
};
