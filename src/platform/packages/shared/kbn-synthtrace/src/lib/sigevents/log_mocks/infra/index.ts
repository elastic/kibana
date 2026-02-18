/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DATABASE } from './database';
import { CACHE } from './cache';
import { MESSAGE_QUEUE } from './message_queue';
import { HOST } from './host';
import { KUBERNETES } from './kubernetes';

export const INFRA = {
  database: DATABASE,
  cache: CACHE,
  message_queue: MESSAGE_QUEUE,
  host: HOST,
  kubernetes: KUBERNETES,
};
