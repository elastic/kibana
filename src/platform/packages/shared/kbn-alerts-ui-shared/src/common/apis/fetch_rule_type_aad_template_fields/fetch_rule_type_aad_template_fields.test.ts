/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import {
  fetchRuleTypeAadTemplateFields,
  getDescription,
} from './fetch_rule_type_aad_template_fields';
import { EcsMetadata } from '@kbn/alerts-as-data-utils/src/field_maps/types';

const http = httpServiceMock.createStartContract();

describe('fetchRuleTypeAadTemplateFields', () => {
  test('should call aad fields endpoint with the correct params', async () => {
    http.get.mockResolvedValueOnce(['mockData']);

    const result = await fetchRuleTypeAadTemplateFields({
      http,
      ruleTypeId: 'test-rule-type-id',
    });

    expect(result).toEqual(['mockData']);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/rac/alerts/aad_fields",
        Object {
          "query": Object {
            "ruleTypeId": "test-rule-type-id",
          },
        },
      ]
    `);
  });
});

describe('getDescription', () => {
  test('should return ecsField description', () => {
    const result = getDescription('test-field-name', {
      'test-field-name': {
        description: 'this is the test field description',
      } as EcsMetadata,
    });

    expect(result).toEqual('this is the test field description');
  });

  test('should return empty string if ecsField does not have a description', () => {
    const result = getDescription('test-field-name', {});

    expect(result).toEqual('');
  });

  test('should truncate field name if it contains kibana.alert', () => {
    const result = getDescription('kibana.alert.test-field-name', {
      'test-field-name': {
        description: 'this is the test field description',
      } as EcsMetadata,
    });

    expect(result).toEqual('this is the test field description');
  });
});
