/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DynamicActionsState } from '../../common';
import { ActionFactory } from '../types';

export const dynamicActionFactoriesCollector = (
  getActionFactory: (id: string) => undefined | ActionFactory,
  state: DynamicActionsState,
  stats: Record<string, string | number | boolean>
): Record<string, string | number | boolean> => {
  for (const event of state.events) {
    const factory = getActionFactory(event.action.factoryId);

    if (factory) {
      stats = factory.telemetry(event, stats);
    }
  }

  return stats;
};
