/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, RequestOptions } from './cloud_service';
import { GCPCloudService } from './gcp';

type Callback = (err: unknown, res: unknown) => void;

const GCP = new GCPCloudService();

describe('GCP', () => {
  it('is named "gcp"', () => {
    expect(GCP.getName()).toEqual('gcp');
  });

  describe('_checkIfService', () => {
    // GCP responds with the header that they expect (and request lowercases the header's name)
    const headers = { 'metadata-flavor': 'Google' };

    it('handles expected responses', async () => {
      const metadata: Record<string, string> = {
        id: 'abcdef',
        'machine-type': 'projects/441331612345/machineTypes/f1-micro',
        zone: 'projects/441331612345/zones/us-fake4-c',
      };
      const request = ((req: RequestOptions, callback: Callback) => {
        const basePath = 'http://169.254.169.254/computeMetadata/v1/instance/';

        expect(req.method).toEqual('GET');
        expect((req.uri as string).startsWith(basePath)).toBe(true);
        expect(req.headers!['Metadata-Flavor']).toEqual('Google');
        expect(req.json).toEqual(false);

        const requestKey = (req.uri as string).substring(basePath.length);
        let body = null;

        if (metadata[requestKey]) {
          body = metadata[requestKey];
        }

        callback(null, { statusCode: 200, body, headers });
      }) as Request;
      const response = await GCP._checkIfService(request);

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: GCP.getName(),
        id: metadata.id,
        region: 'us-fake4',
        vm_type: 'f1-micro',
        zone: 'us-fake4-c',
        metadata: undefined,
      });
    });

    // NOTE: the CloudService method, checkIfService, catches the errors that follow
    it('handles unexpected responses', async () => {
      const request = ((_req: RequestOptions, callback: Callback) =>
        callback(null, { statusCode: 200, headers })) as Request;

      expect(async () => {
        await GCP._checkIfService(request);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"unrecognized responses"`);
    });

    it('handles unexpected responses without response header', async () => {
      const body = 'xyz';
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, { statusCode: 200, body })) as Request;

      expect(async () => {
        await GCP._checkIfService(failedRequest);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"unrecognized responses"`);
    });

    it('handles not running on GCP with error by rethrowing it', async () => {
      const someError = new Error('expected: request failed');
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(someError, null)) as Request;

      expect(async () => {
        await GCP._checkIfService(failedRequest);
      }).rejects.toThrowError(someError);
    });

    it('handles not running on GCP with 404 response by throwing error', async () => {
      const body = 'This is some random error text';
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, { statusCode: 404, headers, body })) as Request;

      expect(async () => {
        await GCP._checkIfService(failedRequest);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GCP request failed"`);
    });

    it('handles not running on GCP with unexpected response by throwing error', async () => {
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, null)) as Request;

      expect(async () => {
        await GCP._checkIfService(failedRequest);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"GCP request failed"`);
    });
  });

  describe('_extractValue', () => {
    it('only handles strings', () => {
      // @ts-expect-error
      expect(GCP._extractValue()).toBe(undefined);
      // @ts-expect-error
      expect(GCP._extractValue(null, null)).toBe(undefined);
      // @ts-expect-error
      expect(GCP._extractValue('abc', { field: 'abcxyz' })).toBe(undefined);
      // @ts-expect-error
      expect(GCP._extractValue('abc', 1234)).toBe(undefined);
      expect(GCP._extractValue('abc/', 'abc/xyz')).toEqual('xyz');
    });

    it('uses the last index of the prefix to truncate', () => {
      expect(GCP._extractValue('abc/', '  \n  123/abc/xyz\t \n')).toEqual('xyz');
    });
  });

  describe('_combineResponses', () => {
    it('parses in expected format', () => {
      const id = '5702733457649812345';
      const machineType = 'projects/441331612345/machineTypes/f1-micro';
      const zone = 'projects/441331612345/zones/us-fake4-c';

      const response = GCP._combineResponses(id, machineType, zone);

      expect(response.getName()).toEqual(GCP.getName());
      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: 'gcp',
        id: '5702733457649812345',
        vm_type: 'f1-micro',
        region: 'us-fake4',
        zone: 'us-fake4-c',
        metadata: undefined,
      });
    });

    it('parses in unexpected format', () => {
      const id = '5702733457649812345';
      // missing prefixes:
      const machineType = 'f1-micro';
      const zone = 'us-fake4-c';

      const response = GCP._combineResponses(id, machineType, zone);

      expect(response.getName()).toEqual(GCP.getName());
      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: 'gcp',
        id: '5702733457649812345',
        vm_type: undefined,
        region: undefined,
        zone: undefined,
        metadata: undefined,
      });
    });

    it('ignores unexpected response body', () => {
      // @ts-expect-error
      expect(() => GCP._combineResponses()).toThrow();
      // @ts-expect-error
      expect(() => GCP._combineResponses(undefined, undefined, undefined)).toThrow();
      // @ts-expect-error
      expect(() => GCP._combineResponses(null, null, null)).toThrow();
      expect(() =>
        // @ts-expect-error
        GCP._combineResponses({ id: 'x' }, { machineType: 'a' }, { zone: 'b' })
      ).toThrow();
      // @ts-expect-error
      expect(() => GCP._combineResponses({ privateIp: 'a.b.c.d' })).toThrow();
    });
  });
});
