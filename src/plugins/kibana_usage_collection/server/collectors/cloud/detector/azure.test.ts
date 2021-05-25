/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Request, RequestOptions } from './cloud_service';
import { AzureCloudService } from './azure';

type Callback = (err: unknown, res: unknown) => void;

const AZURE = new AzureCloudService();

describe('Azure', () => {
  it('is named "azure"', () => {
    expect(AZURE.getName()).toEqual('azure');
  });

  describe('_checkIfService', () => {
    it('handles expected response', async () => {
      const id = 'abcdef';
      const request = ((req: RequestOptions, callback: Callback) => {
        expect(req.method).toEqual('GET');
        expect(req.uri).toEqual('http://169.254.169.254/metadata/instance?api-version=2017-04-02');
        expect(req.headers?.Metadata).toEqual('true');
        expect(req.json).toEqual(true);

        const body = `{"compute":{"vmId": "${id}","location":"fakeus","availabilityZone":"fakeus-2"}}`;

        callback(null, { statusCode: 200, body });
      }) as Request;
      const response = await AZURE._checkIfService(request);

      expect(response.isConfirmed()).toEqual(true);
      expect(response.toJSON()).toEqual({
        name: AZURE.getName(),
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
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(someError, null)) as Request;

      expect(async () => {
        await AZURE._checkIfService(failedRequest);
      }).rejects.toThrowError(someError.message);
    });

    it('handles not running on Azure with 404 response by throwing error', async () => {
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, { statusCode: 404 })) as Request;

      expect(async () => {
        await AZURE._checkIfService(failedRequest);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"Azure request failed"`);
    });

    it('handles not running on Azure with unexpected response by throwing error', async () => {
      const failedRequest = ((_req: RequestOptions, callback: Callback) =>
        callback(null, null)) as Request;

      expect(async () => {
        await AZURE._checkIfService(failedRequest);
      }).rejects.toThrowErrorMatchingInlineSnapshot(`"Azure request failed"`);
    });
  });

  describe('_parseBody', () => {
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

      const response = AzureCloudService.parseBody(AZURE.getName(), body)!;
      expect(response).not.toBeNull();

      expect(response.getName()).toEqual(AZURE.getName());
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

      const response = AzureCloudService.parseBody(AZURE.getName(), body)!;
      expect(response).not.toBeNull();

      expect(response.getName()).toEqual(AZURE.getName());
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
      expect(AzureCloudService.parseBody(AZURE.getName(), undefined)).toBe(null);
      // @ts-expect-error
      expect(AzureCloudService.parseBody(AZURE.getName(), null)).toBe(null);
      // @ts-expect-error
      expect(AzureCloudService.parseBody(AZURE.getName(), {})).toBe(null);
      // @ts-expect-error
      expect(AzureCloudService.parseBody(AZURE.getName(), { privateIp: 'a.b.c.d' })).toBe(null);
    });
  });
});
