/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as connectorsSpecs from './all_specs';
import type { ConnectorSpec } from './connector_spec';
import { getMeta } from './connector_spec_ui';

describe('connector spec config schemas', () => {
  const allSpecs = Object.entries(connectorsSpecs) as Array<[string, ConnectorSpec]>;

  it.each(allSpecs)(
    '%s config schema must not contain sensitive or password-widget fields',
    (_exportName, spec) => {
      const { schema } = spec;
      if (!schema) {
        return;
      }

      const violations: string[] = [];

      for (const fieldKey of Object.keys(schema.shape)) {
        const fieldSchema = schema.shape[fieldKey];
        const meta = getMeta(fieldSchema);
        if (meta.sensitive === true) {
          violations.push(`${fieldKey} has meta.sensitive: true`);
        }
        if (meta.widget === 'password') {
          violations.push(`${fieldKey} has meta.widget: 'password'`);
        }
      }

      expect({
        violations,
        reason:
          'Connector configuration is stored unencrypted. Use auth types and encrypted secrets for credentials.',
      }).toEqual({
        violations: [],
        reason:
          'Connector configuration is stored unencrypted. Use auth types and encrypted secrets for credentials.',
      });
    }
  );
});
