/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getBaseConnectorType } from './get_base_connector_type';

describe('getBaseConnectorType', () => {
  it.each([
    ['aws_lambda.invoke', 'aws_lambda'],
    ['.aws_lambda.invoke', 'aws_lambda'],
    ['elasticsearch.search.query', 'elasticsearch'],
    ['elasticsearch.index', 'elasticsearch'],
    ['kibana.alerting', 'kibana'],
    ['slack_api.postMessage', 'slack'],
    ['slack_api', 'slack'],
    ['console', 'console'],
    ['.jira', 'jira'],
    ['.servicenow', 'servicenow'],
    ['data.set', 'data'],
    ['ai.classify', 'ai'],
  ])('returns "%s" → "%s"', (input, expected) => {
    expect(getBaseConnectorType(input)).toBe(expected);
  });
});
