/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';

import { eventBus } from './event_bus';
import type { EventBusPluginSetup, EventBusPluginStart } from './types';

export type EventBusApi = typeof eventBus;

export class EventBusPlugin implements Plugin<EventBusPluginSetup, EventBusPluginStart> {
  public setup(core: CoreSetup): EventBusPluginSetup {
    return eventBus;
  }

  public start(core: CoreStart): EventBusPluginStart {
    return eventBus;
  }

  public stop() {}
}
