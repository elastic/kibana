/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export type BaseActionConfig = SerializableRecord;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedAction<Config extends BaseActionConfig = BaseActionConfig> = {
  readonly factoryId: string;
  readonly name: string;
  readonly config: Config;
};

/**
 * Serialized representation of a triggers-action pair, used to persist in storage.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type SerializedEvent = {
  eventId: string;
  triggers: string[];
  action: SerializedAction;
};

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type DynamicActionsState = {
  events: SerializedEvent[];
};
