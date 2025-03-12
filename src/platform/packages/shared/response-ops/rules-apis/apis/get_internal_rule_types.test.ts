/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getInternalRuleTypes } from './get_internal_rule_types';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();

describe('getInternalRuleTypes', () => {
  it('should call the internal rule types API', async () => {
    const resolvedValue = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await getInternalRuleTypes({
      http,
    });

    expect(result).toEqual(resolvedValue);

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/internal/alerting/_rule_types",
      ]
    `);
  });
});
