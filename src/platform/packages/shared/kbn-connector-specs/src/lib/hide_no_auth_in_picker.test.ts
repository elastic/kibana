/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodDiscriminatedUnion, ZodObject } from '@kbn/zod/v4';
import { Datadog } from '../specs/datadog/datadog';
import { getMeta } from '../connector_spec_ui';
import { withReceiveOnlyAuth } from '../with_receive_only_auth';
import { fromConnectorSpecSchema, type ConnectorZodSchema } from './deserialize_connector_spec';
import { hideNoAuthInPicker } from './hide_no_auth_in_picker';
import { serializeConnectorSpec } from './serialize_connector_spec';

const getHideInPickerByAuthType = (schema: ConnectorZodSchema): Record<string, unknown> => {
  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    throw new Error('expected secrets to be a discriminated union');
  }
  const { discriminator } = secrets.def;
  return Object.fromEntries(
    secrets.options.map((option) => {
      if (!(option instanceof ZodObject)) {
        throw new Error('expected discriminated union branches to be objects');
      }
      const authTypeField = option.shape[discriminator];
      if (!(authTypeField instanceof z.ZodLiteral)) {
        throw new Error('expected auth discriminator values to be literals');
      }
      return [String(authTypeField.value), getMeta(option).hideInPicker];
    })
  );
};

describe('hideNoAuthInPicker', () => {
  it('marks only auth type none as hidden in the picker', () => {
    const schema = fromConnectorSpecSchema(
      serializeConnectorSpec(withReceiveOnlyAuth(Datadog)).schema
    );
    if (schema === undefined) {
      throw new Error('expected the Datadog spec schema to parse');
    }

    hideNoAuthInPicker(schema);

    const hideInPickerByAuthType = getHideInPickerByAuthType(schema);
    expect(hideInPickerByAuthType.none).toBe(true);
    expect(hideInPickerByAuthType.basic).toBeUndefined();
  });
});
