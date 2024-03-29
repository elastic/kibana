/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';

export type BaseActionConfig = SerializableRecord;

export type SerializedAction<Config extends BaseActionConfig = BaseActionConfig> = {
  readonly factoryId: string;
  readonly name: string;
  readonly config: Config;
};

/**
 * Serialized representation of a triggers-action pair, used to persist in storage.
 */
export type SerializedEvent = {
  eventId: string;
  triggers: string[];
  action: SerializedAction;
};

export type DynamicActionsState = {
  events: SerializedEvent[];
};
