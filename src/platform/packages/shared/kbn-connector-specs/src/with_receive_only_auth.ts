/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthTypeDef, ConnectorSpec } from './connector_spec';
import { isDualConnectorSpec } from './is_dual_connector_spec';
import { RECEIVE_ONLY_AUTH_LABEL } from './auth_types/translations';

const NO_AUTH_TYPE_ID = 'none';

const RECEIVE_ONLY_AUTH_TYPE: AuthTypeDef = {
  type: NO_AUTH_TYPE_ID,
  defaults: {},
  overrides: {
    label: RECEIVE_ONLY_AUTH_LABEL,
  },
};

const augmentedSpecs = new WeakMap<ConnectorSpec, ConnectorSpec>();

const hasNoneAuth = (spec: ConnectorSpec): boolean =>
  (spec.auth?.types ?? []).some(
    (authType) => (typeof authType === 'string' ? authType : authType.type) === NO_AUTH_TYPE_ID
  );

/**
 * Dual specs can receive events without outbound credentials. Appends the `none` auth type
 * when the spec does not already list it. Other specs are returned unchanged.
 */
export const withReceiveOnlyAuth = (spec: ConnectorSpec): ConnectorSpec => {
  if (!isDualConnectorSpec(spec) || hasNoneAuth(spec)) {
    return spec;
  }

  const cached = augmentedSpecs.get(spec);
  if (cached !== undefined) {
    return cached;
  }

  const augmented: ConnectorSpec = {
    ...spec,
    auth: {
      ...spec.auth,
      types: [...(spec.auth?.types ?? []), RECEIVE_ONLY_AUTH_TYPE],
    },
  };
  augmentedSpecs.set(spec, augmented);
  return augmented;
};
