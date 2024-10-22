/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { UiActionsSetup, UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { EventBusPluginSetup, EventBusPluginStart } from '@kbn/event-bus-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsSandboxPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsSandboxPluginStart {}

export interface JsSandboxPluginSetupDeps {
  embeddable: EmbeddableSetup;
  eventBus: EventBusPluginSetup;
  uiActions: UiActionsSetup;
}

export interface JsSandboxPluginStartDeps {
  embeddable: EmbeddableStart;
  eventBus: EventBusPluginStart;
  uiActions: UiActionsStart;
}
