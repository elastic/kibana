/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PersistableState, PersistableStateDefinition } from '@kbn/kibana-utils-plugin/common';

import { SerializedAction, SerializedEvent, DynamicActionsState } from '../common/types';

export type ActionFactoryRegistry = Map<string, ActionFactory>;

export interface ActionFactoryDefinition<P extends SerializedEvent = SerializedEvent>
  extends PersistableStateDefinition<P> {
  id: string;
}

export interface ActionFactory<P extends SerializedEvent = SerializedEvent>
  extends PersistableState<P> {
  id: string;
}

export type { SerializedEvent, SerializedAction, DynamicActionsState };
