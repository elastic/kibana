/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable dot-notation */
jest.mock('node-fetch');
import { GCPCloudService } from './gcp';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

describe('GCP', () => {
  const gcpService = new GCPCloudService();
  beforeEach(() => jest.clearAllMocks());

  it('is named "gcp"', () => {
    expect(gcpService.getName()).toEqual('gcp');
  });

  describe('_checkIfService', () => {
    // GCP responds with the header that they expect (and request lowercases the header's name)
    const headers = new Map();
    headers.set('metadata-flavor', 'Google');

    it('handles expected responses', async () => {
      const basePath = 'http://169.254.169.254/computeMetadata/v1/instance/';
      const metadata: Record<string, string> = {
        id: 'abcdef',
        'machine-type': 'projects/441331612345/machineTypes/f1-micro',
        zone: 'projects/441331612345/zones/us-fake4-c',
      };

      fetchMock.mockImplementation((url: string) => {
        const requestKey = url.substring(basePath.length);
        let body: string | null = null;

        if (metadata[requestKey]) {
          body = metadata[requestKey];
        }
        return {
          status: 200,
          ok: true,
          text: () => body,
          headers,
        };
      });

      const response = await gcpService['_checkIfService']();
      const fetchParams = {
        headers: { 'Metadata-Flavor': 'Google' },
        method: 'GET',
      };
      expect(fetchMock).toBeCalledTimes(3);
      expect(fetchMock).toHaveBeenNthCalledWith(1, `${basePath}id`, fetchParams);
      expect(fetchMock).toHaveBeenNthCalledWith(2, `${basePath}machine-type`, fetchParams);
      expect(fetchMock).toHaveBeenNthCalledWith(3, `${basePath}zone`, fetchParams);

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toMatchInlineSnapshot(`
        Object {
          "id": "abcdef",
          "metadata": undefined,
          "name": "gcp",
          "region": "us-fake4",
          "vm_type": "f1-micro",
          "zone": "us-fake4-c",
        }
      `);
    });

    // NOTE: the CloudService method, checkIfService, catches the errors that follow
    it('handles unexpected responses', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        headers,
        text: () => undefined,
      });

      await expect(() =>
        gcpService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"unrecognized responses"`);
    });

    it('handles unexpected responses without response header', async () => {
      fetchMock.mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Map(),
        text: () => 'xyz',
      });

      await expect(() =>
        gcpService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GCP request failed"`);
    });

    it('handles not running on GCP', async () => {
      const someError = new Error('expected: request failed');
      fetchMock.mockRejectedValue(someError);

      await expect(() =>
        gcpService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GCP request failed"`);
    });

    it('handles not running on GCP with 404 response by throwing error', async () => {
      fetchMock.mockResolvedValue({
        status: 404,
        ok: false,
        headers,
        text: () => 'This is some random error text',
      });

      await expect(() =>
        gcpService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"GCP request failed"`);
    });

    it('handles GCP response even if some requests fail', async () => {
      fetchMock
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          headers,
          text: () => 'some_id',
        })
        .mockRejectedValueOnce({
          status: 500,
          ok: false,
          headers,
          text: () => 'This is some random error text',
        })
        .mockResolvedValueOnce({
          status: 404,
          ok: false,
          headers,
          text: () => 'URI Not found',
        });
      const response = await gcpService['_checkIfService']();

      expect(fetchMock).toBeCalledTimes(3);

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toMatchInlineSnapshot(`
        Object {
          "id": "some_id",
          "metadata": undefined,
          "name": "gcp",
          "region": undefined,
          "vm_type": undefined,
          "zone": undefined,
        }
      `);
    });
  });

  describe('extractValue', () => {
    it('only handles strings', () => {
      // @ts-expect-error
      expect(gcpService['extractValue']()).toBe(undefined);
      // @ts-expect-error
      expect(gcpService['extractValue'](null, null)).toBe(undefined);
      // @ts-expect-error
      expect(gcpService['extractValue']('abc', { field: 'abcxyz' })).toBe(undefined);
      // @ts-expect-error
      expect(gcpService['extractValue']('abc', 1234)).toBe(undefined);
      expect(gcpService['extractValue']('abc/', 'abc/xyz')).toEqual('xyz');
    });

    it('uses the last index of the prefix to truncate', () => {
      expect(gcpService['extractValue']('abc/', '  \n  123/abc/xyz\t \n')).toEqual('xyz');
    });
  });

  describe('combineResponses', () => {
    it('parses in expected format', () => {
      const id = '5702733457649812345';
      const machineType = 'projects/441331612345/machineTypes/f1-micro';
      const zone = 'projects/441331612345/zones/us-fake4-c';

      const response = gcpService['combineResponses'](id, machineType, zone);

      expect(response.getName()).toEqual('gcp');
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

      const response = gcpService['combineResponses'](id, machineType, zone);

      expect(response.getName()).toEqual('gcp');
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
      expect(() => gcpService['combineResponses']()).toThrow();
      expect(() => gcpService['combineResponses'](undefined, undefined, undefined)).toThrow();
      // @ts-expect-error
      expect(() => gcpService['combineResponses'](null, null, null)).toThrow();
      expect(() =>
        // @ts-expect-error
        gcpService['combineResponses']({ id: 'x' }, { machineType: 'a' }, { zone: 'b' })
      ).toThrow();
      // @ts-expect-error
      expect(() => gcpService['combineResponses']({ privateIp: 'a.b.c.d' })).toThrow();
    });
  });
});
