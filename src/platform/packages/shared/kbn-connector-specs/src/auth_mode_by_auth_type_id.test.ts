/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AUTH_MODE_BY_AUTH_TYPE_ID,
  IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID,
  USES_RELAY_BY_AUTH_TYPE_ID,
} from '@kbn/connector-specs-common';
import * as allAuthTypes from './all_auth_types';
import type { AuthMode } from './connector_spec';

function isAuthTypeSpecEntry(value: unknown): value is {
  id: string;
  authMode?: AuthMode;
  usesRelayTransport?: boolean;
  isKibanaManaged?: boolean;
} {
  return typeof (value as { id?: unknown })?.id === 'string';
}

describe('auth mode maps', () => {
  const authTypeSpecs: Array<{
    id: string;
    authMode?: AuthMode;
    usesRelayTransport?: boolean;
    isKibanaManaged?: boolean;
  }> = Object.values(allAuthTypes).filter(isAuthTypeSpecEntry);

  it('matches AUTH_MODE_BY_AUTH_TYPE_ID to registered auth types', () => {
    const expected = Object.fromEntries(
      authTypeSpecs.map((spec) => [spec.id, spec.authMode ?? 'shared'])
    );
    expect(AUTH_MODE_BY_AUTH_TYPE_ID).toEqual(expected);
  });

  it('matches USES_RELAY_BY_AUTH_TYPE_ID to registered auth types', () => {
    const expected = Object.fromEntries(
      authTypeSpecs.map((spec) => [spec.id, spec.usesRelayTransport ?? false])
    );
    expect(USES_RELAY_BY_AUTH_TYPE_ID).toEqual(expected);
  });

  it('matches IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID to registered auth types', () => {
    const expected = Object.fromEntries(
      authTypeSpecs.map((spec) => [spec.id, spec.isKibanaManaged ?? false])
    );
    expect(IS_KIBANA_MANAGED_BY_AUTH_TYPE_ID).toEqual(expected);
  });
});
