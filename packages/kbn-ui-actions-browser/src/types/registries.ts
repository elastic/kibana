/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ActionInternal } from '../actions/action_internal';
import type { TriggerInternal } from '../triggers/trigger_internal';

export type TriggerRegistry = Map<string, TriggerInternal<object>>;
export type ActionRegistry = Map<string, ActionInternal>;
export type TriggerToActionsRegistry = Map<string, string[]>;
