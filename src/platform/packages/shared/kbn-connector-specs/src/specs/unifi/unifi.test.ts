/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorActionErrorMeta, getEstimatedBase64OutputBytes } from '../../connector_utils';
import { getConnectorSpec } from '../../..';
import { Unifi } from './unifi';
import {
  PROTECT_DEVICE_TYPES,
  UnifiAuthorizeGuestAccessInputSchema,
  UnifiGetCameraSnapshotInputSchema,
  UnifiListDevicesInputSchema,
  UnifiMovePtzCameraInputSchema,
  UnifiPowerCyclePortInputSchema,
} from './types';

const CONSOLE_URL = 'https://192.168.1.1';
const NETWORK_BASE = `${CONSOLE_URL}/proxy/network/integration/v1`;
const PROTECT_BASE = `${CONSOLE_URL}/proxy/protect/integration/v1`;

const SITE_ID = '11111111-2222-3333-4444-555555555555';
const DEVICE_ID = '66666666-7777-8888-9999-aaaaaaaaaaaa';
const CLIENT_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';
const CAMERA_ID = '66d025b301ebc903e80003ea';

describe('UniFi', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { consoleUrl: CONSOLE_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.get.mockResolvedValue({ data: {} });
    mockClient.post.mockResolvedValue({ data: {} });
  });

  it('should be defined', () => {
    expect(Unifi).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.unifi');
    expect(spec).toBe(Unifi);
    expect(spec?.actions.listSites).toBeDefined();
    expect(spec?.actions.listSites.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Unifi.metadata.id).toBe('.unifi');
    expect(Unifi.metadata.displayName).toBe('UniFi');
    expect(Unifi.metadata.minimumLicense).toBe('enterprise');
    expect(Unifi.metadata.supportedFeatureIds).toEqual(['agentBuilder', 'workflows']);
  });

  it('should support api_key_header auth using the X-API-KEY header', () => {
    const types = (Unifi.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('api_key_header');
    const apiKeyAuth = (
      Unifi.auth?.types as Array<{ type: string; defaults?: { headerField?: string } }>
    ).find((t) => t.type === 'api_key_header');
    expect(apiKeyAuth?.defaults?.headerField).toBe('X-API-KEY');
  });

  it('should expose every action as a tool with a description', () => {
    for (const [name, action] of Object.entries(Unifi.actions)) {
      expect({ name, isTool: action.isTool }).toEqual({ name, isTool: true });
      expect(action.description).toEqual(expect.any(String));
      expect(String(action.description).length).toBeGreaterThan(40);
    }
  });

  it('should enable the connector test handler', () => {
    expect(Unifi.test.enabled).toBe(true);
  });

  describe('console URL handling', () => {
    it('should route Network and Protect actions to their own proxy prefixes on one console', async () => {
      await Unifi.actions.getNetworkInfo.handler(mockContext, {});
      await Unifi.actions.getProtectInfo.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenNthCalledWith(1, `${NETWORK_BASE}/info`, undefined);
      expect(mockClient.get).toHaveBeenNthCalledWith(2, `${PROTECT_BASE}/meta/info`, undefined);
    });

    it('should support the Site Manager Cloud Connector base URL', async () => {
      const cloudCtx = {
        ...mockContext,
        config: { consoleUrl: 'https://api.ui.com/v1/connector/consoles/ABC123' },
      } as unknown as ActionContext;

      await Unifi.actions.getProtectInfo.handler(cloudCtx, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.ui.com/v1/connector/consoles/ABC123/proxy/protect/integration/v1/meta/info',
        undefined
      );
    });

    it('should tolerate a trailing slash or a pasted application prefix', async () => {
      const messyCtx = {
        ...mockContext,
        config: { consoleUrl: 'https://192.168.1.1/proxy/network/integration/v1/' },
      } as unknown as ActionContext;

      await Unifi.actions.getNetworkInfo.handler(messyCtx, {});

      expect(mockClient.get).toHaveBeenCalledWith(`${NETWORK_BASE}/info`, undefined);
    });

    it('should throw when the console URL is not configured', async () => {
      const noUrlCtx = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(Unifi.actions.getNetworkInfo.handler(noUrlCtx, {})).rejects.toThrow(
        'UniFi connector is missing the required Console URL configuration field.'
      );
    });
  });

  describe('UniFi Network reads', () => {
    it('should pass offset, limit and filter through as query params', async () => {
      await Unifi.actions.listDevices.handler(mockContext, {
        siteId: SITE_ID,
        offset: 25,
        limit: 50,
        filter: "state.eq('OFFLINE')",
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${NETWORK_BASE}/sites/${SITE_ID}/devices`, {
        params: { offset: 25, limit: 50, filter: "state.eq('OFFLINE')" },
      });
    });

    it('should omit unset pagination params rather than sending undefined', async () => {
      await Unifi.actions.listClients.handler(mockContext, { siteId: SITE_ID });

      expect(mockClient.get).toHaveBeenCalledWith(`${NETWORK_BASE}/sites/${SITE_ID}/clients`, {
        params: {},
      });
    });

    it('should build the latest-statistics path for a device', async () => {
      await Unifi.actions.getDeviceStatistics.handler(mockContext, {
        siteId: SITE_ID,
        deviceId: DEVICE_ID,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/devices/${DEVICE_ID}/statistics/latest`,
        undefined
      );
    });

    it('should not send a filter param on listWans, which does not support filtering', async () => {
      await Unifi.actions.listWans.handler(mockContext, { siteId: SITE_ID, limit: 10 });

      expect(mockClient.get).toHaveBeenCalledWith(`${NETWORK_BASE}/sites/${SITE_ID}/wans`, {
        params: { limit: 10 },
      });
    });
  });

  describe('UniFi Network control actions', () => {
    it('should POST the RESTART action envelope', async () => {
      await Unifi.actions.restartDevice.handler(mockContext, {
        siteId: SITE_ID,
        deviceId: DEVICE_ID,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/devices/${DEVICE_ID}/actions`,
        { action: 'RESTART' }
      );
    });

    it('should POST the POWER_CYCLE action to the port sub-resource', async () => {
      await Unifi.actions.powerCyclePort.handler(mockContext, {
        siteId: SITE_ID,
        deviceId: DEVICE_ID,
        portIdx: 7,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/devices/${DEVICE_ID}/interfaces/ports/7/actions`,
        { action: 'POWER_CYCLE' }
      );
    });

    // The Network API models guest limits as properties of the discriminated
    // `Client action request` body, not as query params — sending them in the query
    // string is accepted and silently ignored, so assert the exact request shape.
    it('should send guest authorization limits in the request body, not the query string', async () => {
      await Unifi.actions.authorizeGuestAccess.handler(mockContext, {
        siteId: SITE_ID,
        clientId: CLIENT_ID,
        timeLimitMinutes: 120,
        rxRateLimitKbps: 5000,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/clients/${CLIENT_ID}/actions`,
        { action: 'AUTHORIZE_GUEST_ACCESS', timeLimitMinutes: 120, rxRateLimitKbps: 5000 }
      );
      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(mockClient.post.mock.calls[0][2]).toBeUndefined();
    });

    it('should omit unset guest limits so the site defaults apply', async () => {
      await Unifi.actions.authorizeGuestAccess.handler(mockContext, {
        siteId: SITE_ID,
        clientId: CLIENT_ID,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/clients/${CLIENT_ID}/actions`,
        { action: 'AUTHORIZE_GUEST_ACCESS' }
      );
    });

    it('should POST the UNAUTHORIZE_GUEST_ACCESS action envelope', async () => {
      await Unifi.actions.unauthorizeGuestAccess.handler(mockContext, {
        siteId: SITE_ID,
        clientId: CLIENT_ID,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${NETWORK_BASE}/sites/${SITE_ID}/clients/${CLIENT_ID}/actions`,
        { action: 'UNAUTHORIZE_GUEST_ACCESS' }
      );
    });
  });

  describe('UniFi Protect', () => {
    it('should map every supported device type to its collection path', async () => {
      for (const deviceType of PROTECT_DEVICE_TYPES) {
        await Unifi.actions.listProtectDevices.handler(mockContext, { deviceType });
      }

      expect(mockClient.get.mock.calls.map(([url]) => url)).toEqual(
        PROTECT_DEVICE_TYPES.map((deviceType) => `${PROTECT_BASE}/${deviceType}`)
      );
    });

    it('should build the per-device path for getProtectDevice', async () => {
      await Unifi.actions.getProtectDevice.handler(mockContext, {
        deviceType: 'sensors',
        deviceId: CAMERA_ID,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${PROTECT_BASE}/sensors/${CAMERA_ID}`,
        undefined
      );
    });

    it('should read the NVR from the console-scoped path', async () => {
      await Unifi.actions.getNvr.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(`${PROTECT_BASE}/nvrs`, undefined);
    });

    // channel and highQuality are string enums on the wire ("main"/"package",
    // "true"/"false"), so a JSON boolean would be rejected.
    it('should request the snapshot as an arraybuffer and stringify highQuality', async () => {
      mockClient.get.mockResolvedValue({ data: Buffer.from('jpeg-bytes') });

      const result = (await Unifi.actions.getCameraSnapshot.handler(mockContext, {
        cameraId: CAMERA_ID,
        channel: 'package',
        highQuality: true,
      })) as { base64: string; contentType: string; base64Length: number };

      expect(mockClient.get).toHaveBeenCalledWith(`${PROTECT_BASE}/cameras/${CAMERA_ID}/snapshot`, {
        params: { channel: 'package', highQuality: 'true' },
        responseType: 'arraybuffer',
      });
      expect(result.contentType).toBe('image/jpeg');
      expect(Buffer.from(result.base64, 'base64').toString()).toBe('jpeg-bytes');
      expect(result.base64Length).toBe(result.base64.length);
    });

    it('should omit snapshot params that were not supplied', async () => {
      mockClient.get.mockResolvedValue({ data: Buffer.from('x') });

      await Unifi.actions.getCameraSnapshot.handler(mockContext, { cameraId: CAMERA_ID });

      expect(mockClient.get).toHaveBeenCalledWith(`${PROTECT_BASE}/cameras/${CAMERA_ID}/snapshot`, {
        params: {},
        responseType: 'arraybuffer',
      });
    });

    it('should send highQuality=false rather than dropping an explicit false', async () => {
      mockClient.get.mockResolvedValue({ data: Buffer.from('x') });

      await Unifi.actions.getCameraSnapshot.handler(mockContext, {
        cameraId: CAMERA_ID,
        highQuality: false,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${PROTECT_BASE}/cameras/${CAMERA_ID}/snapshot`, {
        params: { highQuality: 'false' },
        responseType: 'arraybuffer',
      });
    });

    it('should POST to the PTZ goto path including the negative home slot', async () => {
      await Unifi.actions.movePtzCameraToPreset.handler(mockContext, {
        cameraId: CAMERA_ID,
        slot: '-1',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${PROTECT_BASE}/cameras/${CAMERA_ID}/ptz/goto/-1`,
        undefined
      );
    });
  });

  describe('input validation', () => {
    it('should reject a siteId that is not a UUID', () => {
      expect(UnifiListDevicesInputSchema.safeParse({ siteId: '../../etc/passwd' }).success).toBe(
        false
      );
      expect(UnifiListDevicesInputSchema.safeParse({ siteId: SITE_ID }).success).toBe(true);
    });

    it('should reject a Protect camera id containing path separators', () => {
      expect(UnifiGetCameraSnapshotInputSchema.safeParse({ cameraId: 'abc/../nvrs' }).success).toBe(
        false
      );
      expect(UnifiGetCameraSnapshotInputSchema.safeParse({ cameraId: CAMERA_ID }).success).toBe(
        true
      );
    });

    it('should reject a PTZ slot that is not an integer', () => {
      expect(
        UnifiMovePtzCameraInputSchema.safeParse({ cameraId: CAMERA_ID, slot: 'home' }).success
      ).toBe(false);
      expect(
        UnifiMovePtzCameraInputSchema.safeParse({ cameraId: CAMERA_ID, slot: '-1' }).success
      ).toBe(true);
    });

    it('should enforce the vendor-documented bounds on guest access limits', () => {
      const base = { siteId: SITE_ID, clientId: CLIENT_ID };
      expect(
        UnifiAuthorizeGuestAccessInputSchema.safeParse({ ...base, rxRateLimitKbps: 1 }).success
      ).toBe(false);
      expect(
        UnifiAuthorizeGuestAccessInputSchema.safeParse({ ...base, rxRateLimitKbps: 100001 }).success
      ).toBe(false);
      expect(
        UnifiAuthorizeGuestAccessInputSchema.safeParse({ ...base, dataUsageLimitMBytes: 1048577 })
          .success
      ).toBe(false);
      expect(
        UnifiAuthorizeGuestAccessInputSchema.safeParse({ ...base, timeLimitMinutes: 120 }).success
      ).toBe(true);
    });

    it('should cap the page limit at the API maximum of 200', () => {
      expect(UnifiListDevicesInputSchema.safeParse({ siteId: SITE_ID, limit: 201 }).success).toBe(
        false
      );
      expect(UnifiListDevicesInputSchema.safeParse({ siteId: SITE_ID, limit: 200 }).success).toBe(
        true
      );
    });

    it('should require a positive integer port index', () => {
      const base = { siteId: SITE_ID, deviceId: DEVICE_ID };
      expect(UnifiPowerCyclePortInputSchema.safeParse({ ...base, portIdx: 0 }).success).toBe(false);
      expect(UnifiPowerCyclePortInputSchema.safeParse({ ...base, portIdx: 1.5 }).success).toBe(
        false
      );
      expect(UnifiPowerCyclePortInputSchema.safeParse({ ...base, portIdx: 7 }).success).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should surface the application name and vendor message on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 404, data: { message: 'Site not found' } },
        message: 'Request failed with status code 404',
      });

      await expect(
        Unifi.actions.listDevices.handler(mockContext, { siteId: SITE_ID })
      ).rejects.toThrow('UniFi Network listDevices failed (status 404): Site not found');
    });

    it('should add an API key hint on 401/403 so a permissions gap is not read as a missing device', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Request failed with status code 403',
      });

      await expect(
        Unifi.actions.listProtectDevices.handler(mockContext, { deviceType: 'cameras' })
      ).rejects.toThrow(
        'UniFi Protect listProtectDevices failed (status 403): Forbidden. Check that the API key is valid and that the account that created it can access this application.'
      );
    });

    // Observed live: a real camera snapshot exceeds the 1mb default
    // xpack.actions.maxResponseContentLength. Axios reports this with no response and no
    // status, so without special-casing it the operator sees a bare "status unknown" and
    // has nothing to act on.
    it('should name the response-size setting when a snapshot exceeds the connector limit', async () => {
      mockClient.get.mockRejectedValue({
        message: 'maxContentLength size of 1048576 exceeded',
      });

      await expect(
        Unifi.actions.getCameraSnapshot.handler(mockContext, { cameraId: CAMERA_ID })
      ).rejects.toThrow(
        "UniFi Protect getCameraSnapshot failed: the response exceeded Kibana's connector response size limit (maxContentLength size of 1048576 exceeded). Raise xpack.actions.maxResponseContentLength"
      );
    });

    it('should attach size metadata when the failing response declares a content-length', async () => {
      const rawBytes = 2 * 1024 * 1024;
      mockClient.get.mockRejectedValue({
        message: 'maxContentLength size of 1048576 exceeded',
        response: { headers: { 'content-length': String(rawBytes) } },
      });

      const error = await Unifi.actions.getCameraSnapshot
        .handler(mockContext, { cameraId: CAMERA_ID })
        .catch((e: unknown) => e);

      expect(getConnectorActionErrorMeta(error)).toEqual({
        contentLengthBytes: rawBytes,
        estimatedOutputBytes: getEstimatedBase64OutputBytes(rawBytes),
      });
    });
  });

  describe('connectivity test', () => {
    it('should report the Network application version', async () => {
      mockClient.get.mockResolvedValue({ data: { applicationVersion: '10.4.57' } });

      const testHandler = Unifi.test.handler;
      if (!testHandler) {
        throw new Error('UniFi connector must define a test handler');
      }
      const result = await testHandler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${NETWORK_BASE}/info`, undefined);
      expect(result).toEqual({
        message:
          'Successfully connected to the UniFi console (Network application version 10.4.57).',
      });
    });
  });
});
