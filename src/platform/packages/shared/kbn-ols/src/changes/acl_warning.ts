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
 * Access that is stored but can't be fully used yet, returned with a successful ACL change. It
 * applies as soon as the principal gets the feature privileges it needs.
 */
export type AclWarning =
  | {
      /** An entry, whose principal lacks the feature privileges of the entry's access. */
      target: 'entry';
      /** The principal the entry names. */
      principal: Principal;
      /** The access the entry grants. */
      access: EntryAccess;
      /** Why the entry can't be fully used. */
      reason: 'missing_feature_privileges';
    }
  | {
      /**
       * The new owner, who lacks the feature privileges of the `view` and `edit` operations that
       * managing access and transferring the object need.
       */
      target: 'owner';
      /** The new owner. */
      principal: Principal;
      /** Why the owner can't manage the object. */
      reason: 'missing_feature_privileges';
    };
