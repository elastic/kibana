/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compact } from 'lodash';
import type { ConnectorSpec } from '../connector_spec';
import { getAuthType } from './get_auth_type';

export const generateSecrets = (
  authSpec: ConnectorSpec['auth'],
  secret: Record<string, unknown>
) => {
  const authTypes = authSpec?.types;
  if (!authTypes || authTypes.length === 0) {
    return { authType: 'none' };
  }

  const builtSecrets = compact(
    authTypes.map((type) => {
      const { authType, defaults } = getAuthType(type);
      const secretObj = authType.buildSecret(secret, defaults);
      return secretObj ? { authType: authType.id, ...secretObj } : null;
    })
  );

  if (builtSecrets.length === 0) {
    throw new Error('No valid authentication secrets could be generated.');
  }

  if (builtSecrets.length > 1) {
    throw new Error('Multiple authentication secrets generated, expected only one.');
  }

  return builtSecrets?.[0];
};
