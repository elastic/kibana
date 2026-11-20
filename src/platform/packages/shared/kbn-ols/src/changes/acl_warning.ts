/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EntryAccess } from '../levels';
import type { Principal } from '../principals';

/**
 * A stored change that a principal can't fully use yet, returned with a successful ACL change.
 * The change applies as soon as the principal gets the feature privileges it needs.
 *
 * - `entry`: a grant to a principal who lacks the feature privileges of its access.
 * - `owner`: a new owner who lacks the feature privileges to manage access or transfer the object.
 */
export type AclWarning =
  | {
      target: 'entry';
      /** The recipient of the grant. */
      principal: Principal;
      /** The access the grant gives. */
      access: EntryAccess;
      /** Why the grant can't be fully used yet. */
      reason: 'missing_feature_privileges';
    }
  | {
      target: 'owner';
      /** The new owner. */
      principal: Principal;
      /** Why the owner can't fully use the object yet. */
      reason: 'missing_feature_privileges';
    };
