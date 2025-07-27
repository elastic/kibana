/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectAccessControl } from '@kbn/core/server';

interface CheckUserAccessControlOptions {
  accessControl?: Partial<SavedObjectAccessControl>;
  createdBy?: string;
  userId?: string;
}

export const checkUserAccessControl = ({
  accessControl,
  createdBy,
  userId,
}: CheckUserAccessControlOptions) => {
  if (!userId) {
    return false;
  }

  if (!accessControl?.owner) {
    // New dashboard
    if (!createdBy) {
      return true;
    }
    return userId === createdBy;
  }

  return userId === accessControl.owner;
};
