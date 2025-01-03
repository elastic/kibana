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
import { AzureCloudService } from './azure';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fetchMock = require('node-fetch') as jest.Mock;

describe('AzureCloudService', () => {
  const azureCloudService = new AzureCloudService();
  it('is named "azure"', () => {
    expect(azureCloudService.getName()).toEqual('azure');
  });

  describe('_checkIfService', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

    it('handles expected response', async () => {
      const id = 'abcdef';
      fetchMock.mockResolvedValue({
        json: () =>
          `{"compute":{"vmId": "${id}","location":"fakeus","availabilityZone":"fakeus-2"}}`,
        status: 200,
        ok: true,
      });

      const response = await azureCloudService['_checkIfService']();

      expect(fetchMock).toBeCalledTimes(1);
      expect(fetchMock).toBeCalledWith(
        'http://169.254.169.254/metadata/instance?api-version=2017-04-02',
        {
          method: 'GET',
          headers: { Metadata: 'true' },
        }
      );

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: azureCloudService.getName(),
        id,
        region: 'fakeus',
        vm_type: undefined,
        zone: undefined,
        metadata: {
          availabilityZone: 'fakeus-2',
        },
      });
    });

    // NOTE: the CloudService method, checkIfService, catches the errors that follow
    it('handles not running on Azure with error by rethrowing it', async () => {
      const someError = new Error('expected: request failed');
      fetchMock.mockRejectedValue(someError);

      await expect(() => azureCloudService['_checkIfService']()).rejects.toThrowError(
        someError.message
      );
    });

    it('handles not running on Azure with 404 response by throwing error', async () => {
      fetchMock.mockResolvedValue({ status: 404 });

      await expect(() =>
        azureCloudService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Azure request failed"`);
    });

    it('handles not running on Azure with unexpected response by throwing error', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      await expect(() =>
        azureCloudService['_checkIfService']()
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Azure request failed"`);
    });
  });

  describe('parseBody', () => {
    // it's expected that most users use the resource manager UI (which has been out for years)
    it('parses object in expected format', () => {
      const body = {
        compute: {
          location: 'eastus',
          name: 'pickypg-ubuntu-rm',
          offer: 'UbuntuServer',
          osType: 'Linux',
          platformFaultDomain: '0',
          platformUpdateDomain: '0',
          publisher: 'Canonical',
          sku: '16.04-LTS',
          version: '16.04.201706191',
          vmId: 'd4c57456-2b3b-437a-9f1f-7082cf123456',
          vmSize: 'Standard_A1',
        },
        network: {
          interface: [
            {
              ipv4: {
                ipAddress: [
                  {
                    privateIpAddress: '10.1.0.4',
                    publicIpAddress: '52.170.25.71',
                  },
                ],
                subnet: [
                  {
                    address: '10.1.0.0',
                    prefix: '24',
                  },
                ],
              },
              ipv6: {
                ipAddress: [],
              },
              macAddress: '000D3A143CE3',
            },
          ],
        },
      };

      const response = azureCloudService['parseBody'](body)!;
      expect(response).not.toBeNull();

      expect(response.getName()).toEqual(azureCloudService.getName());
      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: 'azure',
        id: 'd4c57456-2b3b-437a-9f1f-7082cf123456',
        vm_type: 'Standard_A1',
        region: 'eastus',
        zone: undefined,
        metadata: {
          name: 'pickypg-ubuntu-rm',
          offer: 'UbuntuServer',
          osType: 'Linux',
          platformFaultDomain: '0',
          platformUpdateDomain: '0',
          publisher: 'Canonical',
          sku: '16.04-LTS',
          version: '16.04.201706191',
        },
      });
    });

    // classic represents the "old" way of launching things in Azure
    it('parses object in expected classic format', () => {
      const body = {
        network: {
          interface: [
            {
              ipv4: {
                ipAddress: [
                  {
                    privateIpAddress: '10.1.0.4',
                    publicIpAddress: '52.170.25.71',
                  },
                ],
                subnet: [
                  {
                    address: '10.1.0.0',
                    prefix: '24',
                  },
                ],
              },
              ipv6: {
                ipAddress: [],
              },
              macAddress: '000D3A143CE3',
            },
          ],
        },
      };

      const response = azureCloudService['parseBody'](body)!;
      expect(response).not.toBeNull();

      expect(response.getName()).toEqual(azureCloudService.getName());
      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: 'azure',
        id: undefined,
        vm_type: undefined,
        region: undefined,
        zone: undefined,
        metadata: {
          classic: true,
        },
      });
    });

    it('ignores unexpected response body', () => {
      // @ts-expect-error
      expect(azureCloudService['parseBody'](undefined)).toBe(null);
      // @ts-expect-error
      expect(azureCloudService['parseBody'](null)).toBe(null);
      // @ts-expect-error
      expect(azureCloudService['parseBody']({})).toBe(null);
      // @ts-expect-error
      expect(azureCloudService['parseBody']({ privateIp: 'a.b.c.d' })).toBe(null);
    });
  });
});
