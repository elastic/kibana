/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { getSchemaForAuthType } from './get_schema_for_auth_type';

describe('getSchemaForAuthType()', () => {
  test('correctly returns schema for auth type definition when only type ID is provided', () => {
    const schema = getSchemaForAuthType('basic');
    expect(z.toJSONSchema(schema)).toMatchSnapshot();
  });

  test('correctly returns schema for auth type definition when defaults are provided', () => {
    const schema = getSchemaForAuthType({
      type: 'api_key_header',
      defaults: {
        headerField: 'custom-api-key-field',
      },
    });
    expect(z.toJSONSchema(schema)).toMatchSnapshot();
  });

  test('ignores defaults for key that is not in auth type schema', () => {
    const schema = getSchemaForAuthType({
      type: 'api_key_header',
      defaults: {
        noField: 'custom-api-key-field2',
      },
    });
    expect(z.toJSONSchema(schema)).toMatchSnapshot();
  });

  test('throws for invalid auth type ID', () => {
    expect(() => {
      getSchemaForAuthType('invalid_auth_type');
    }).toThrowErrorMatchingInlineSnapshot(`"Auth type with id invalid_auth_type not found."`);

    expect(() => {
      getSchemaForAuthType({
        type: 'another_invalid_auth_type',
        defaults: {
          noField: 'custom-api-key-field2',
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Auth type with id another_invalid_auth_type not found."`
    );
  });

  test('throws for missing auth type ID', () => {
    expect(() => {
      // @ts-expect-error Testing missing type
      getSchemaForAuthType({
        defaults: {
          noField: 'custom-api-key-field2',
        },
      });
    }).toThrowErrorMatchingInlineSnapshot(`"Auth type ID must be provided."`);
  });
});
