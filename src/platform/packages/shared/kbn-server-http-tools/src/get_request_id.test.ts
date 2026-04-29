/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRequestId } from './get_request_id';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'),
}));

describe('getRequestId', () => {
  describe('when allowFromAnyIp is true', () => {
    it('generates a UUID if no x-opaque-id header is present', () => {
      const request = {
        headers: {},
        raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
      } as any;
      expect(getRequestId(request, { allowFromAnyIp: true, ipAllowlist: [] })).toEqual(
        'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      );
    });

    it('uses x-opaque-id header value if present', () => {
      const request = {
        headers: {
          'x-opaque-id': 'id from header',
        },
        raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
      } as any;
      expect(getRequestId(request, { allowFromAnyIp: true, ipAllowlist: [] })).toEqual(
        'id from header'
      );
    });
  });

  describe('when allowFromAnyIp is false', () => {
    describe('and ipAllowlist is empty', () => {
      it('generates a UUID even if x-opaque-id header is present', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: [] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });
    });

    describe('and ipAllowlist is not empty', () => {
      it('uses x-opaque-id header if request comes from trusted IP address', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'id from header'
        );
      });

      it('generates a UUID if request comes from untrusted IP address', () => {
        const request = {
          headers: { 'x-opaque-id': 'id from header' },
          raw: { req: { socket: { remoteAddress: '5.5.5.5' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });

      it('generates UUID if request comes from trusted IP address but no x-opaque-id header is present', () => {
        const request = {
          headers: {},
          raw: { req: { socket: { remoteAddress: '1.1.1.1' } } },
        } as any;
        expect(getRequestId(request, { allowFromAnyIp: false, ipAllowlist: ['1.1.1.1'] })).toEqual(
          'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
        );
      });
    });
  });
});
