/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DefaultAppStateColumn } from '../../types';

export const LOG_LEVEL_COLUMN: DefaultAppStateColumn = { name: 'log.level', width: 150 };
export const MESSAGE_COLUMN: DefaultAppStateColumn = { name: 'message' };
export const CLIENT_IP_COLUMN: DefaultAppStateColumn = { name: 'client.ip', width: 150 };
export const HOST_NAME_COLUMN: DefaultAppStateColumn = { name: 'host.name', width: 250 };
