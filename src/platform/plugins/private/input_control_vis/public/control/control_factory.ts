/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { rangeControlFactory } from './range_control_factory';
import { listControlFactory } from './list_control_factory';
import { ControlParams, CONTROL_TYPES } from '../editor_utils';

export function getControlFactory(controlParams: ControlParams) {
  let factory = null;
  switch (controlParams.type) {
    case CONTROL_TYPES.RANGE:
      factory = rangeControlFactory;
      break;
    case CONTROL_TYPES.LIST:
      factory = listControlFactory;
      break;
    default:
      throw new Error(`Unhandled control type ${controlParams.type}`);
  }
  return factory;
}
