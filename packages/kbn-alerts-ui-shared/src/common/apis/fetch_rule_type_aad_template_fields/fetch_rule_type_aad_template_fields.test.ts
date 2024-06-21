/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { fetchRuleTypeAadTemplateFields } from './fetch_rule_type_aad_template_fields';

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
