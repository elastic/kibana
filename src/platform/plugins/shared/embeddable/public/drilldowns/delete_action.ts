/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { uiActions } from '../kibana_services';
import type { DrilldownActionState } from './types';

export function deleteAction(drilldownState: DrilldownActionState) {
  const { actionId, trigger } = drilldownState;
  if (!uiActions.hasAction(actionId)) return;

  uiActions.detachAction(trigger, actionId);
  uiActions.unregisterAction(actionId);
}
