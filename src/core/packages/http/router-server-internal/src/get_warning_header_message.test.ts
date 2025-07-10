/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDeprecationInfo } from '@kbn/core-http-server';
import { getWarningHeaderMessageFromRouteDeprecation } from './get_warning_header_message';

describe('getWarningHeaderMessageFromRouteDeprecation', () => {
  it('creates the warning with a default message if the deprecation object does not have one', () => {
    const kibanaVersion = '12.31.45';
    const expectedMessage = `299 Kibana-${kibanaVersion} "This endpoint deprecated"`;
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
    };
    expect(getWarningHeaderMessageFromRouteDeprecation(deprecationObject, expectedMessage)).toMatch(
      expectedMessage
    );
  });

  it('creates the warning with the deprecation object message', () => {
    const kibanaVersion = '12.31.45';
    const msg = 'Custom deprecation message for this object';
    const expectedMessage = `299 Kibana-${kibanaVersion} "${msg}"`;
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
      message: msg,
    };
    expect(getWarningHeaderMessageFromRouteDeprecation(deprecationObject, expectedMessage)).toMatch(
      expectedMessage
    );
  });
});
