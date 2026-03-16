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
  const kibanaVersion = '12.31.45';

  it('creates the warning with a default message if the deprecation object does not have one', () => {
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
    };
    expect(getWarningHeaderMessageFromRouteDeprecation(deprecationObject, kibanaVersion)).toEqual(
      `299 Kibana-${kibanaVersion} "This%20endpoint%20is%20deprecated"`
    );
  });

  it('creates the warning with the deprecation object message', () => {
    const msg = 'Custom deprecation message for this object';
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
      message: msg,
    };
    expect(getWarningHeaderMessageFromRouteDeprecation(deprecationObject, kibanaVersion)).toEqual(
      `299 Kibana-${kibanaVersion} "${encodeURIComponent(msg)}"`
    );
  });

  it('encodes non-ASCII characters in the message', () => {
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
      message: 'このAPIは非推奨です',
    };
    const result = getWarningHeaderMessageFromRouteDeprecation(deprecationObject, kibanaVersion);
    expect(result).toEqual(
      `299 Kibana-${kibanaVersion} "${encodeURIComponent('このAPIは非推奨です')}"`
    );
    expect(result).not.toMatch(/[^\x20-\x7E]/);
  });

  it('truncates the header when the encoded message exceeds the max length', () => {
    const longMsg = 'a'.repeat(5000);
    const deprecationObject: RouteDeprecationInfo = {
      reason: { type: 'deprecate' },
      severity: 'warning',
      documentationUrl: 'fakeurl.com',
      message: longMsg,
    };
    const result = getWarningHeaderMessageFromRouteDeprecation(deprecationObject, kibanaVersion);
    expect(result.length).toBeLessThanOrEqual(4000);
    expect(result).toMatch(/\.\.\."/);
  });
});
