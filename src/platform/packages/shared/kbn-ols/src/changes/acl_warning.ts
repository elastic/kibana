/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntryLevel } from '../levels';
import type { Principal } from '../principals';

/**
 * A grant that is stored but can't be fully used yet, returned with a successful ACL change. The
 * grant applies as soon as the recipient gets the feature privileges its level needs.
 */
export interface AclWarning {
  /** The recipient of the grant. */
  principal: Principal;
  /** The level the grant gives. */
  level: EntryLevel;
  /** Why the grant can't be fully used: the recipient lacks the level's feature privileges. */
  reason: 'missing_feature_privileges';
}
