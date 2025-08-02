/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SearchSessionStatus } from '../../../../../../../common';
import { UISearchSessionState } from '../../../types';
import { Action } from '../actions';

export function getActions(status: UISearchSessionState) {
  const actions: Action[] = [];

  actions.push('inspect');
  actions.push('rename');
  if (status === SearchSessionStatus.IN_PROGRESS || status === SearchSessionStatus.COMPLETE) {
    actions.push('extend');
  }
  actions.push('delete');

  return actions;
}
