/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  MAX_HANDSHAKE_CHALLENGE_LENGTH,
} from '@kbn/connector-specs-common';
import { buildEventId } from '../../event_type_id';

export { INBOUND_WEBHOOK_CONNECTOR_TYPE_ID, MAX_HANDSHAKE_CHALLENGE_LENGTH };

export const INBOUND_WEBHOOK_RECEIVED_EVENT_KEY = 'received' as const;

export const INBOUND_WEBHOOK_RECEIVED_EVENT_ID = buildEventId(
  INBOUND_WEBHOOK_CONNECTOR_TYPE_ID,
  INBOUND_WEBHOOK_RECEIVED_EVENT_KEY
);
