/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isString } from 'lodash';
import { authTypeSpecs } from '../..';
import type { AuthTypeDef, NormalizedAuthType } from '../connector_spec';

interface GetAuthTypeResult {
  authType: NormalizedAuthType;
  defaults?: Record<string, unknown>;
  meta?: Record<string, Record<string, unknown>>;
}

const getAuthTypeForId = (id: string): NormalizedAuthType => {
  for (const s of Object.values(authTypeSpecs)) {
    if (s.id === id) {
      return s as NormalizedAuthType;
    }
  }

  throw new Error(`Auth type with id ${id} not found.`);
};

export const getAuthType = (authTypeDef: string | AuthTypeDef): GetAuthTypeResult => {
  let authTypeId: string | undefined;
  let defaults: Record<string, unknown> | undefined;
  let meta: Record<string, Record<string, unknown>> | undefined;

  if (isString(authTypeDef)) {
    authTypeId = authTypeDef as string;
  } else {
    const def = authTypeDef as AuthTypeDef;
    authTypeId = def.type;
    defaults = def.defaults;
    meta = def?.overrides?.meta;
  }

  if (!authTypeId) {
    throw new Error('Auth type ID must be provided.');
  }

  const authType = getAuthTypeForId(authTypeId);
  return { authType, defaults, meta };
};
