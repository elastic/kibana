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
jest.mock('fs/promises');
import { AWSCloudService, AWSResponse } from './aws';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { readFile } = require('fs/promises') as { readFile: jest.Mock };

describe('AWS', () => {
  const mockIsWindows = jest.fn();
  const awsService = new AWSCloudService();
  awsService['_isWindows'] = mockIsWindows.mockReturnValue(false);
  readFile.mockResolvedValue('eC2abcdef-ghijk\n');

  beforeEach(() => jest.clearAllMocks());
  it('is named "aws"', () => {
    expect(awsService.getName()).toEqual('aws');
  });

  describe('_checkIfService', () => {
    it('handles expected response', async () => {
      const id = 'abcdef';

      fetchMock.mockResolvedValue({
        json: () =>
          `{"instanceId": "${id}","availabilityZone":"us-fake-2c", "imageId" : "ami-6df1e514"}`,
        status: 200,
        ok: true,
      });

      const response = await awsService['_checkIfService']();
      expect(readFile).toBeCalledTimes(0);
      expect(fetchMock).toBeCalledTimes(1);
      expect(fetchMock).toBeCalledWith(
        'http://169.254.169.254/2016-09-02/dynamic/instance-identity/document',
        {
          method: 'GET',
        }
      );

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toMatchInlineSnapshot(`
        Object {
          "id": "abcdef",
          "metadata": Object {
            "imageId": "ami-6df1e514",
          },
          "name": "aws",
          "region": undefined,
          "vm_type": undefined,
          "zone": "us-fake-2c",
        }
      `);
    });

    it('handles request without a usable body by downgrading to UUID detection', async () => {
      fetchMock.mockResolvedValue({
        json: () => null,
        status: 200,
        ok: true,
      });

      const response = await awsService['_checkIfService']();

      expect(response.isConfirmed()).toBe(true);
      expect(response.toJSON()).toMatchInlineSnapshot(`
        Object {
          "id": "ec2abcdef-ghijk",
          "metadata": undefined,
          "name": "aws",
          "region": undefined,
          "vm_type": undefined,
          "zone": undefined,
        }
      `);
    });

    it('handles request failure by downgrading to UUID detection', async () => {
      fetchMock.mockResolvedValue({
        status: 404,
        ok: false,
      });

      const response = await awsService['_checkIfService']();

      expect(response.isConfirmed()).toBe(true);
      expect(response.toJSON()).toMatchInlineSnapshot(`
        Object {
          "id": "ec2abcdef-ghijk",
          "metadata": undefined,
          "name": "aws",
          "region": undefined,
          "vm_type": undefined,
          "zone": undefined,
        }
      `);
    });

    it('handles not running on AWS', async () => {
      fetchMock.mockResolvedValue({
        json: () => null,
        status: 404,
        ok: false,
      });

      mockIsWindows.mockReturnValue(true);

      const response = await awsService['_checkIfService']();
      expect(mockIsWindows).toBeCalledTimes(1);
      expect(readFile).toBeCalledTimes(0);

      expect(response.getName()).toEqual('aws');
      expect(response.isConfirmed()).toBe(false);
    });
  });

  describe('parseBody', () => {
    it('parses object in expected format', () => {
      const body: AWSResponse = {
        devpayProductCodes: null,
        privateIp: '10.0.0.38',
        availabilityZone: 'us-west-2c',
        version: '2010-08-31',
        instanceId: 'i-0c7a5b7590a4d811c',
        billingProducts: null,
        instanceType: 't2.micro',
        accountId: '1234567890',
        architecture: 'x86_64',
        kernelId: null,
        ramdiskId: null,
        imageId: 'ami-6df1e514',
        pendingTime: '2017-07-06T02:09:12Z',
        region: 'us-west-2',
        marketplaceProductCodes: null,
      };

      const response = awsService.parseBody(body)!;
      expect(response).not.toBeNull();

      expect(response.getName()).toEqual('aws');
      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: 'aws',
        id: 'i-0c7a5b7590a4d811c',
        vm_type: 't2.micro',
        region: 'us-west-2',
        zone: 'us-west-2c',
        metadata: {
          version: '2010-08-31',
          architecture: 'x86_64',
          kernelId: null,
          marketplaceProductCodes: null,
          ramdiskId: null,
          imageId: 'ami-6df1e514',
          pendingTime: '2017-07-06T02:09:12Z',
        },
      });
    });

    it('ignores unexpected response body', () => {
      // @ts-expect-error
      expect(awsService.parseBody(undefined)).toBe(null);
      // @ts-expect-error
      expect(awsService.parseBody(null)).toBe(null);
      // @ts-expect-error
      expect(awsService.parseBody({})).toBe(null);
      // @ts-expect-error
      expect(awsService.parseBody({ privateIp: 'a.b.c.d' })).toBe(null);
    });
  });

  describe('tryToDetectUuid', () => {
    describe('checks the file system for UUID if not Windows', () => {
      beforeAll(() => mockIsWindows.mockReturnValue(false));

      it('checks /sys/hypervisor/uuid and /sys/devices/virtual/dmi/id/product_uuid', async () => {
        const response = await awsService['tryToDetectUuid']();

        readFile.mockImplementation(async (filename: string, encoding: string) => {
          expect(['/sys/hypervisor/uuid', '/sys/devices/virtual/dmi/id/product_uuid']).toContain(
            filename
          );
          expect(encoding).toEqual('utf8');

          return 'eC2abcdef-ghijk\n';
        });

        expect(readFile).toBeCalledTimes(2);
        expect(response.isConfirmed()).toEqual(true);
        expect(response.toJSON()).toMatchInlineSnapshot(`
          Object {
            "id": "ec2abcdef-ghijk",
            "metadata": undefined,
            "name": "aws",
            "region": undefined,
            "vm_type": undefined,
            "zone": undefined,
          }
        `);
      });

      it('returns confirmed if only one file exists', async () => {
        readFile.mockRejectedValueOnce(new Error('oops'));
        readFile.mockResolvedValueOnce('ec2Uuid');

        const response = await awsService['tryToDetectUuid']();
        expect(readFile).toBeCalledTimes(2);

        expect(response.isConfirmed()).toEqual(true);
        expect(response.toJSON()).toMatchInlineSnapshot(`
          Object {
            "id": "ec2uuid",
            "metadata": undefined,
            "name": "aws",
            "region": undefined,
            "vm_type": undefined,
            "zone": undefined,
          }
        `);
      });

      it('returns unconfirmed if all files return errors', async () => {
        readFile.mockRejectedValue(new Error('oops'));

        const response = await awsService['tryToDetectUuid']();
        expect(response.isConfirmed()).toEqual(false);
      });

      it('ignores UUID if it does not start with ec2', async () => {
        readFile.mockResolvedValue('notEC2');

        const response = await awsService['tryToDetectUuid']();
        expect(response.isConfirmed()).toEqual(false);
      });
    });

    it('does NOT check the file system for UUID on Windows', async () => {
      mockIsWindows.mockReturnValue(true);
      const response = await awsService['tryToDetectUuid']();

      expect(response.isConfirmed()).toEqual(false);
    });
  });
});
