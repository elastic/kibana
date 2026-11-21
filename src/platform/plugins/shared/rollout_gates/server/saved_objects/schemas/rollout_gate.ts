/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { MAX_GATE_ID_LENGTH } from '../../lib/constants';

export const rolloutGateSchemaV1 = schema.object({
  /** The gate id, or the genesis record's reserved label. Stored for debugging only. */
  gateId: schema.string({ maxLength: MAX_GATE_ID_LENGTH }),
  buildSha: schema.string({ maxLength: 64 }),
  buildNum: schema.number(),
  buildDate: schema.string({ maxLength: 64 }),
  recordedAt: schema.string({ maxLength: 64 }),
});

export type RolloutGateAttributes = TypeOf<typeof rolloutGateSchemaV1>;
