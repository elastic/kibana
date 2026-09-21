/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * UniFi Connector (UniFi Network + UniFi Protect)
 *
 * A UniFi console — a Dream Machine / UDM-Pro / UDM-SE, Cloud Gateway, or UNVR — hosts each
 * UniFi application behind its own reverse-proxy prefix on the same host, authenticated by the
 * same API key:
 *
 *   {consoleUrl}/proxy/network/integration/v1/...   (UniFi Network API)
 *   {consoleUrl}/proxy/protect/integration/v1/...   (UniFi Protect API)
 *
 * That is why one connector covers both applications: `consoleUrl` is the shared console base,
 * and each handler picks its application prefix. The same shape works for the Site Manager Cloud
 * Connector (`https://api.ui.com/v1/connector/consoles/{consoleId}`), which proxies to an
 * on-prem console without a VPN, so both local and cloud deployments use one config field.
 *
 * The two applications do NOT share conventions beyond auth and host:
 *  - Network is site-scoped and paginated: every list returns
 *    `{offset, limit, count, totalCount, data[]}` and accepts `offset`/`limit`/`filter`.
 *  - Protect is console-scoped and unpaginated: lists return a bare JSON array.
 *
 * https://developer.ui.com/network/v10.4.57/gettingstarted
 * https://developer.ui.com/protect/v7.1.87/gettingstarted
 */

import { i18n } from '@kbn/i18n';
import { z, lazySchema } from '@kbn/zod/v4';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { UISchemas } from '../../connector_spec';
import {
  setConnectorActionErrorMeta,
  getEstimatedBase64OutputBytes,
  getResponseContentLengthBytes,
} from '../../connector_utils';
import {
  UnifiAuthorizeGuestAccessInputSchema,
  UnifiGetCameraSnapshotInputSchema,
  UnifiGetClientInputSchema,
  UnifiGetDeviceInputSchema,
  UnifiGetProtectDeviceInputSchema,
  UnifiListClientsInputSchema,
  UnifiListDevicesInputSchema,
  UnifiListProtectDevicesInputSchema,
  UnifiListSitesInputSchema,
  UnifiMovePtzCameraInputSchema,
  UnifiPowerCyclePortInputSchema,
  UnifiRestartDeviceInputSchema,
  UnifiSiteFilterablePageInputSchema,
  UnifiSitePageInputSchema,
  UnifiUnauthorizeGuestAccessInputSchema,
} from './types';
import type {
  UnifiAuthorizeGuestAccessInput,
  UnifiGetCameraSnapshotInput,
  UnifiGetClientInput,
  UnifiGetDeviceInput,
  UnifiGetProtectDeviceInput,
  UnifiListClientsInput,
  UnifiListDevicesInput,
  UnifiListProtectDevicesInput,
  UnifiListSitesInput,
  UnifiMovePtzCameraInput,
  UnifiPowerCyclePortInput,
  UnifiRestartDeviceInput,
  UnifiSiteFilterablePageInput,
  UnifiSitePageInput,
  UnifiUnauthorizeGuestAccessInput,
} from './types';

type UnifiApp = 'network' | 'protect';

/**
 * Users routinely paste the application base rather than the console base (it is what the
 * developer portal's "try it" panel shows). Strip a trailing application prefix and any trailing
 * slash so both `https://192.168.1.1` and
 * `https://192.168.1.1/proxy/protect/integration/v1` resolve to the same console root.
 */
const normalizeConsoleUrl = (raw: string): string =>
  raw
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/proxy\/(?:network|protect)\/integration(?:\/v\d+)?$/i, '')
    .replace(/\/+$/, '');

const getConsoleUrl = (ctx: ActionContext): string => {
  const raw = ctx.config?.consoleUrl as string | undefined;
  if (!raw || typeof raw !== 'string' || !raw.trim()) {
    throw new Error('UniFi connector is missing the required Console URL configuration field.');
  }
  return normalizeConsoleUrl(raw);
};

const buildUrl = (ctx: ActionContext, app: UnifiApp, path: string): string =>
  `${getConsoleUrl(ctx)}/proxy/${app}/integration/v1${path}`;

function formatUnifiError(app: UnifiApp, operation: string, error: unknown): Error {
  const err = error as AxiosError<{ error?: string; message?: string; statusName?: string }>;
  const status = err.response?.status;
  const body = err.response?.data;
  const detail = body?.message ?? body?.error ?? err.message;
  const appName = app === 'network' ? 'UniFi Network' : 'UniFi Protect';

  // Kibana caps every connector response at `xpack.actions.maxResponseContentLength`
  // (1mb by default) on the shared Axios instance. A Protect camera snapshot routinely
  // exceeds that, and Axios reports it as a bare "maxContentLength size of N exceeded"
  // with no response and no status — opaque enough that it reads like a network fault.
  // The limit is deliberately NOT overridden per request: it is an operator-controlled
  // memory guard, and no other connector bypasses it (Google Drive's downloadFile and
  // S3's getObject both surface it too). Name the setting instead so the operator can
  // make that trade-off knowingly.
  if (typeof err.message === 'string' && err.message.includes('maxContentLength size of')) {
    const limitError = new Error(
      `${appName} ${operation} failed: the response exceeded Kibana's connector response size limit (${err.message}). Raise xpack.actions.maxResponseContentLength if this connector needs to return payloads this large — note it applies to every connector, not just UniFi.`
    );
    const contentLengthBytes = getResponseContentLengthBytes(error);
    if (contentLengthBytes !== undefined) {
      setConnectorActionErrorMeta(limitError, {
        contentLengthBytes,
        estimatedOutputBytes: getEstimatedBase64OutputBytes(contentLengthBytes),
      });
    }
    return limitError;
  }

  if (status === 401 || status === 403) {
    return new Error(
      `${appName} ${operation} failed (status ${status}): ${detail}. Check that the API key is valid and that the account that created it can access this application.`
    );
  }
  return new Error(`${appName} ${operation} failed (status ${status ?? 'unknown'}): ${detail}`);
}

const unifiGet = async <T>(
  ctx: ActionContext,
  app: UnifiApp,
  operation: string,
  path: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await ctx.client
    .get<T>(buildUrl(ctx, app, path), config)
    .catch((error: unknown) => {
      throw formatUnifiError(app, operation, error);
    });
  return response.data;
};

const unifiPost = async <T>(
  ctx: ActionContext,
  app: UnifiApp,
  operation: string,
  path: string,
  body?: unknown
): Promise<T> => {
  const response = await ctx.client
    .post<T>(buildUrl(ctx, app, path), body)
    .catch((error: unknown) => {
      throw formatUnifiError(app, operation, error);
    });
  return response.data;
};

/** Drop undefined entries so optional pagination/filter params are omitted rather than sent empty. */
const pickDefined = (params: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined));

const pageParams = (input: { offset?: number; limit?: number; filter?: string }) =>
  pickDefined({ offset: input.offset, limit: input.limit, filter: input.filter });

export const Unifi: ConnectorSpec = {
  metadata: {
    id: '.unifi',
    displayName: 'UniFi',
    description: i18n.translate('core.kibanaConnectorSpecs.unifi.metadata.description', {
      defaultMessage:
        'List UniFi sites, devices, clients and networks, inspect Protect cameras and sensors, and restart devices',
    }),
    minimumLicense: 'enterprise',
    isTechnicalPreview: true,
    // Step 2 of the two-step release for a new connector type. `.unifi` shipped with
    // ['agentBuilder'] only and has since reached Production-NonCanary, so every node
    // now registers the type and declaring a user-facing feature can no longer leave a
    // persisted workflow referencing a type some node lacks.
    supportedFeatureIds: ['agentBuilder', 'workflows'],
  },

  auth: {
    types: [
      {
        type: 'api_key_header',
        isRecommended: true,
        defaults: { headerField: 'X-API-KEY' },
        overrides: {
          meta: {
            'X-API-KEY': {
              label: i18n.translate('core.kibanaConnectorSpecs.unifi.auth.apiKey.label', {
                defaultMessage: 'API key',
              }),
              helpText: i18n.translate('core.kibanaConnectorSpecs.unifi.auth.apiKey.helpText', {
                defaultMessage:
                  'A UniFi API key, sent as the X-API-KEY header. For a local console, create it in the UniFi OS UI under Settings > Control Plane > Integrations > Create API Key. For the Site Manager Cloud Connector, create it at unifi.ui.com under Settings > API Keys. The key is shown only once. The key inherits the permissions of the account that created it, so use an account with access to both the Network and Protect applications; an Admin (not Viewer) role is required for restartDevice, powerCyclePort, the guest authorization actions, and movePtzCameraToPreset.',
              }),
            },
          },
        },
      },
    ],
  },

  schema: lazySchema(() =>
    z.object({
      consoleUrl: UISchemas.url()
        .describe('UniFi console base URL, without the /proxy/... application prefix.')
        .meta({
          widget: 'text',
          label: i18n.translate('core.kibanaConnectorSpecs.unifi.config.consoleUrl.label', {
            defaultMessage: 'Console URL',
          }),
          placeholder: 'https://192.168.1.1',
          helpText: i18n.translate('core.kibanaConnectorSpecs.unifi.config.consoleUrl.helpText', {
            defaultMessage:
              'The base URL of the UniFi console (Dream Machine, Cloud Gateway or UNVR), e.g. https://192.168.1.1 — do not include /proxy/network/integration or /proxy/protect/integration. To reach a console through the Site Manager Cloud Connector instead of over the LAN, use https://api.ui.com/v1/connector/consoles/your-console-id. A local console must be network-reachable from Kibana and usually presents a self-signed certificate, so add its host to xpack.actions.customHostSettings or use the cloud connector form.',
          }),
          validate: { allowedHosts: true },
        }),
    })
  ),

  validateUrls: {
    fields: ['consoleUrl'],
  },

  actions: {
    // ------------------------------------------------------------------
    // UniFi Network — discovery and reads
    // ------------------------------------------------------------------
    getNetworkInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Get the UniFi Network application version running on the console. Cheapest call to confirm the console is reachable and the API key grants Network access before running other Network actions.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        return unifiGet(ctx, 'network', 'getNetworkInfo', '/info');
      },
    },

    listSites: {
      isTool: true,
      scope: 'read',
      description:
        'List the UniFi Network sites on this console. Start here: almost every other Network action requires a siteId, and a typical console has exactly one site. Returns a paginated envelope {offset, limit, count, totalCount, data[]} where each entry has an `id` (the siteId) and a name.',
      input: UnifiListSitesInputSchema,
      handler: async (ctx, input: UnifiListSitesInput) => {
        return unifiGet(ctx, 'network', 'listSites', '/sites', { params: pageParams(input) });
      },
    },

    listDevices: {
      isTool: true,
      scope: 'read',
      description:
        'List the UniFi devices adopted by a site (access points, switches, gateways) with model, MAC, IP, state and firmware status. Use this to inventory hardware or to find offline devices and pending firmware updates. Filterable on id, macAddress, ipAddress, name, model, state, supported, firmwareVersion, firmwareUpdatable, features and interfaces. Returns a paginated envelope; pass the `id` of a result to getDevice or getDeviceStatistics.',
      input: UnifiListDevicesInputSchema,
      handler: async (ctx, input: UnifiListDevicesInput) => {
        return unifiGet(
          ctx,
          'network',
          'listDevices',
          `/sites/${encodeURIComponent(input.siteId)}/devices`,
          { params: pageParams(input) }
        );
      },
    },

    getDevice: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for one adopted device, including its port and radio interfaces, uplink, and firmware state. Use the `id` returned by listDevices. Call this before powerCyclePort to find the port number to act on.',
      input: UnifiGetDeviceInputSchema,
      handler: async (ctx, input: UnifiGetDeviceInput) => {
        return unifiGet(
          ctx,
          'network',
          'getDevice',
          `/sites/${encodeURIComponent(input.siteId)}/devices/${encodeURIComponent(input.deviceId)}`
        );
      },
    },

    getDeviceStatistics: {
      isTool: true,
      scope: 'read',
      description:
        'Get the latest real-time statistics for one adopted device: uptime, CPU and memory utilization, and TX/RX throughput. Use this to judge whether a device is unhealthy or saturated, after locating it with listDevices.',
      input: UnifiGetDeviceInputSchema,
      handler: async (ctx, input: UnifiGetDeviceInput) => {
        return unifiGet(
          ctx,
          'network',
          'getDeviceStatistics',
          `/sites/${encodeURIComponent(input.siteId)}/devices/${encodeURIComponent(
            input.deviceId
          )}/statistics/latest`
        );
      },
    },

    listClients: {
      isTool: true,
      scope: 'read',
      description:
        'List clients currently connected to a site — wired and wireless endpoints plus active VPN connections — with MAC, IP, connection time and guest-authorization state. Use this to answer "who or what is on the network right now". Filterable on id, type, macAddress, ipAddress, connectedAt, access.type and access.authorized. Returns a paginated envelope. Note this only covers currently connected clients, not historical ones.',
      input: UnifiListClientsInputSchema,
      handler: async (ctx, input: UnifiListClientsInput) => {
        return unifiGet(
          ctx,
          'network',
          'listClients',
          `/sites/${encodeURIComponent(input.siteId)}/clients`,
          { params: pageParams(input) }
        );
      },
    },

    getClient: {
      isTool: true,
      scope: 'read',
      description:
        'Get full details for one connected client, including which device and port or radio it is attached to and its guest access state. Use the `id` returned by listClients.',
      input: UnifiGetClientInputSchema,
      handler: async (ctx, input: UnifiGetClientInput) => {
        return unifiGet(
          ctx,
          'network',
          'getClient',
          `/sites/${encodeURIComponent(input.siteId)}/clients/${encodeURIComponent(input.clientId)}`
        );
      },
    },

    listNetworks: {
      isTool: true,
      scope: 'read',
      description:
        'List the networks (VLANs, LANs and guest networks) configured on a site, with their subnets and VLAN IDs. Use this to map a client IP to the network it belongs to, or to audit network segmentation.',
      input: UnifiSiteFilterablePageInputSchema,
      handler: async (ctx, input: UnifiSiteFilterablePageInput) => {
        return unifiGet(
          ctx,
          'network',
          'listNetworks',
          `/sites/${encodeURIComponent(input.siteId)}/networks`,
          { params: pageParams(input) }
        );
      },
    },

    listWans: {
      isTool: true,
      scope: 'read',
      description:
        'List the WAN (internet uplink) interfaces on a site with their current status. Use this to diagnose an internet outage or to check which WAN is active on a multi-WAN gateway. Supports offset/limit paging but not filtering.',
      input: UnifiSitePageInputSchema,
      handler: async (ctx, input: UnifiSitePageInput) => {
        return unifiGet(
          ctx,
          'network',
          'listWans',
          `/sites/${encodeURIComponent(input.siteId)}/wans`,
          { params: pageParams(input) }
        );
      },
    },

    listFirewallPolicies: {
      isTool: true,
      scope: 'read',
      description:
        'List the firewall policies configured on a site, including their source and destination zones, action and enabled state. Use this to audit what traffic is allowed or blocked between network zones. Returns a paginated envelope.',
      input: UnifiSiteFilterablePageInputSchema,
      handler: async (ctx, input: UnifiSiteFilterablePageInput) => {
        return unifiGet(
          ctx,
          'network',
          'listFirewallPolicies',
          `/sites/${encodeURIComponent(input.siteId)}/firewall/policies`,
          { params: pageParams(input) }
        );
      },
    },

    // ------------------------------------------------------------------
    // UniFi Network — control actions
    // ------------------------------------------------------------------
    restartDevice: {
      isTool: true,
      scope: 'destroy',
      description:
        'Restart an adopted UniFi device. DISRUPTIVE: the device and everything connected through it drops offline for roughly a minute. Only call this when the user has asked for a restart or a diagnosis has established the device is wedged. Confirm the target with getDevice first — an accidental gateway restart takes the whole site down.',
      input: UnifiRestartDeviceInputSchema,
      handler: async (ctx, input: UnifiRestartDeviceInput) => {
        await unifiPost(
          ctx,
          'network',
          'restartDevice',
          `/sites/${encodeURIComponent(input.siteId)}/devices/${encodeURIComponent(
            input.deviceId
          )}/actions`,
          { action: 'RESTART' }
        );
        return { restarted: true, deviceId: input.deviceId };
      },
    },

    powerCyclePort: {
      isTool: true,
      scope: 'destroy',
      description:
        "PoE power-cycle a single switch port, rebooting only the device powered by that port. DISRUPTIVE but narrowly scoped — prefer this over restartDevice when one PoE camera or access point is unresponsive. Call getDevice first to read the switch's `interfaces.ports` and pick the right port number. The port must be actively supplying PoE: a port whose `poe` is null returns 422 'Port does not support PoE', and a port whose `poe.state` is 'DOWN' returns 422 'Port is not supplying power' even though `poe.enabled` is true. Both mean the target is wrong, not that the request failed — pick a port whose `poe.state` is 'UP', and note that a device connected to a non-PoE port is self-powered and cannot be rebooted this way.",
      input: UnifiPowerCyclePortInputSchema,
      handler: async (ctx, input: UnifiPowerCyclePortInput) => {
        await unifiPost(
          ctx,
          'network',
          'powerCyclePort',
          `/sites/${encodeURIComponent(input.siteId)}/devices/${encodeURIComponent(
            input.deviceId
          )}/interfaces/ports/${encodeURIComponent(String(input.portIdx))}/actions`,
          { action: 'POWER_CYCLE' }
        );
        return { powerCycled: true, deviceId: input.deviceId, portIdx: input.portIdx };
      },
    },

    authorizeGuestAccess: {
      isTool: true,
      scope: 'write',
      description:
        "Authorize a guest client on the site's guest network, optionally capping session duration, total data and up/down rate. Use this to grant a visitor access after finding their client with listClients. Omit the optional limits to inherit the site's guest policy defaults.",
      input: UnifiAuthorizeGuestAccessInputSchema,
      handler: async (ctx, input: UnifiAuthorizeGuestAccessInput) => {
        // The limit fields belong in the JSON body alongside `action` (the Network API models
        // this as a discriminated `Client action request`), not in the query string.
        await unifiPost(
          ctx,
          'network',
          'authorizeGuestAccess',
          `/sites/${encodeURIComponent(input.siteId)}/clients/${encodeURIComponent(
            input.clientId
          )}/actions`,
          pickDefined({
            action: 'AUTHORIZE_GUEST_ACCESS',
            timeLimitMinutes: input.timeLimitMinutes,
            dataUsageLimitMBytes: input.dataUsageLimitMBytes,
            rxRateLimitKbps: input.rxRateLimitKbps,
            txRateLimitKbps: input.txRateLimitKbps,
          })
        );
        return { authorized: true, clientId: input.clientId };
      },
    },

    unauthorizeGuestAccess: {
      isTool: true,
      scope: 'destroy',
      description:
        "Revoke a guest client's network authorization and disconnect it. Use this to cut off a visitor or a device that should not be on the guest network. The client can re-authorize through the guest portal unless it is blocked separately.",
      input: UnifiUnauthorizeGuestAccessInputSchema,
      handler: async (ctx, input: UnifiUnauthorizeGuestAccessInput) => {
        await unifiPost(
          ctx,
          'network',
          'unauthorizeGuestAccess',
          `/sites/${encodeURIComponent(input.siteId)}/clients/${encodeURIComponent(
            input.clientId
          )}/actions`,
          { action: 'UNAUTHORIZE_GUEST_ACCESS' }
        );
        return { unauthorized: true, clientId: input.clientId };
      },
    },

    // ------------------------------------------------------------------
    // UniFi Protect
    // ------------------------------------------------------------------
    getProtectInfo: {
      isTool: true,
      scope: 'read',
      description:
        'Get the UniFi Protect application version running on the console. Cheapest call to confirm Protect is installed on this console and the API key grants Protect access before running other Protect actions.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        return unifiGet(ctx, 'protect', 'getProtectInfo', '/meta/info');
      },
    },

    listProtectDevices: {
      isTool: true,
      scope: 'read',
      description:
        "List every UniFi Protect device of one family — cameras, lights, sensors, chimes, sirens, speakers, viewers, fobs, relays, bridges, link-stations or alarm-hubs — with each device's id, name, MAC and connection state. This is the entry point for all Protect work: use it to inventory hardware, find offline cameras, or resolve a device name to the id needed by getProtectDevice, getCameraSnapshot and movePtzCameraToPreset. Unlike the Network actions this returns a bare JSON array with no paging.",
      input: UnifiListProtectDevicesInputSchema,
      handler: async (ctx, input: UnifiListProtectDevicesInput) => {
        return unifiGet(
          ctx,
          'protect',
          'listProtectDevices',
          `/${encodeURIComponent(input.deviceType)}`
        );
      },
    },

    getProtectDevice: {
      isTool: true,
      scope: 'read',
      description:
        "Get full details for one UniFi Protect device, including per-family settings such as a camera's video mode, HDR type, smart-detection configuration and on-screen display, or a light's brightness and motion settings. Use the deviceType and `id` returned by listProtectDevices.",
      input: UnifiGetProtectDeviceInputSchema,
      handler: async (ctx, input: UnifiGetProtectDeviceInput) => {
        return unifiGet(
          ctx,
          'protect',
          'getProtectDevice',
          `/${encodeURIComponent(input.deviceType)}/${encodeURIComponent(input.deviceId)}`
        );
      },
    },

    getNvr: {
      isTool: true,
      scope: 'read',
      description:
        'Get details about the UniFi Protect NVR itself — the recorder running on the console — including its version, storage state and current arm mode. Use this to check recording capacity or overall Protect health, as opposed to the state of an individual camera.',
      input: lazySchema(() => z.object({})),
      handler: async (ctx) => {
        return unifiGet(ctx, 'protect', 'getNvr', '/nvrs');
      },
    },

    getCameraSnapshot: {
      isTool: true,
      scope: 'read',
      description:
        'Capture a still JPEG image from a Protect camera and return it base64-encoded. WARNING: this returns a large binary payload (hundreds of kilobytes, larger still with highQuality) that consumes a great deal of context and cannot be interpreted as text. Only call it when there is a concrete plan to process the image — for example passing it to an Elasticsearch ingest pipeline attachment processor or handing it to a vision-capable step — never merely to "check" a camera. To verify a camera is online, use getProtectDevice and read its `state` instead. Returns the fields cameraId, contentType, base64Length and base64. Fails with 503 when the camera is offline. Also fails when the image exceeds Kibana\'s connector response size limit — snapshots from current UniFi cameras are typically larger than the 1mb default, so an operator must raise xpack.actions.maxResponseContentLength before this action can succeed.',
      input: UnifiGetCameraSnapshotInputSchema,
      handler: async (ctx, input: UnifiGetCameraSnapshotInput) => {
        const path = `/cameras/${encodeURIComponent(input.cameraId)}/snapshot`;
        // Both query params are string enums on the wire ("true"/"false", "main"/"package"),
        // not JSON booleans, so highQuality is stringified rather than sent as a boolean.
        const params = pickDefined({
          channel: input.channel,
          highQuality: input.highQuality === undefined ? undefined : String(input.highQuality),
        });
        const data = await unifiGet<ArrayBuffer>(ctx, 'protect', 'getCameraSnapshot', path, {
          params,
          responseType: 'arraybuffer',
        });
        const base64 = Buffer.from(data).toString('base64');
        return {
          cameraId: input.cameraId,
          contentType: 'image/jpeg',
          base64Length: base64.length,
          base64,
        };
      },
    },

    movePtzCameraToPreset: {
      isTool: true,
      scope: 'destroy',
      description:
        'Move a PTZ camera to one of its saved preset positions. Only works on cameras with pan/tilt/zoom support; slot "-1" is the home preset and "0" and above are user-configured presets. Use this to point a camera at an area of interest before capturing a snapshot.',
      input: UnifiMovePtzCameraInputSchema,
      handler: async (ctx, input: UnifiMovePtzCameraInput) => {
        await unifiPost(
          ctx,
          'protect',
          'movePtzCameraToPreset',
          `/cameras/${encodeURIComponent(input.cameraId)}/ptz/goto/${encodeURIComponent(
            input.slot
          )}`
        );
        return { moved: true, cameraId: input.cameraId, slot: input.slot };
      },
    },
  },

  test: {
    enabled: true,
    description: i18n.translate('core.kibanaConnectorSpecs.unifi.test.description', {
      defaultMessage: 'Verifies the connection by reading the UniFi Network application info',
    }),
    handler: async (ctx) => {
      const info = await unifiGet<{ applicationVersion?: string }>(ctx, 'network', 'test', '/info');
      return {
        message: `Successfully connected to the UniFi console (Network application version ${
          info?.applicationVersion ?? 'unknown'
        }).`,
      };
    },
  },

  skill: [
    '## UniFi Connector',
    '',
    'One connector covering two applications hosted on the same UniFi console (a Dream Machine,',
    'Cloud Gateway or UNVR): UniFi Network for wired/wireless infrastructure, and UniFi Protect for',
    'cameras and other security devices. Both use the same console URL and the same API key, but',
    'they are separate APIs with different conventions — do not assume a pattern from one holds in',
    'the other.',
    '',
    '### Start here',
    'Network actions are site-scoped: call `listSites` first and reuse the returned `id` as `siteId`',
    'for every other Network action. Most consoles have exactly one site. Protect actions are',
    'console-scoped and take no siteId at all.',
    '',
    'If a call fails with 401 or 403 while others succeed, the API key belongs to an account without',
    'access to that specific application — Network and Protect permissions are granted separately.',
    'Use `getNetworkInfo` and `getProtectInfo` to establish which applications are reachable before',
    'concluding a device is missing. A console with no Protect installed returns 404 on every',
    'Protect action.',
    '',
    '### Paging and filtering differ between the two applications',
    'Network lists return `{offset, limit, count, totalCount, data[]}`; page with `offset`/`limit`',
    '(max 200, default 25) and compare against `totalCount`. Protect lists return a bare JSON array',
    'with no paging and no filtering — fetch the whole family and narrow client-side.',
    '',
    "The Network `filter` parameter uses UniFi's own grammar, not KQL or Lucene:",
    '`property.function(args)` with `and(...)`, `or(...)` and `not(...)` for composition, e.g.',
    "`and(state.eq('OFFLINE'), name.like('AP*'))`. String arguments need single quotes. Each",
    'endpoint allows a different property set, so if a filter is rejected, list without it first and',
    'filter on a property visible in the response.',
    '',
    '### Typical investigations',
    "Offline hardware: `listDevices` with `filter: state.ne('ONLINE')`, then `getDevice` for uplink",
    'detail and `getDeviceStatistics` for CPU, memory and throughput.',
    'Who is on the network: `listClients`, then `getClient` for the device and port a client is',
    'attached to, and `listNetworks` to map its IP to a VLAN.',
    'Internet problems: `listWans` for uplink status before looking at individual devices.',
    'Camera health: `listProtectDevices` with `deviceType: cameras` and read each `state` — do not',
    'call `getCameraSnapshot` for this.',
    '',
    '### Acting on findings',
    'Prefer the narrowest remedy. `powerCyclePort` reboots just the device on one PoE port and is',
    "the right first move for a single unresponsive camera or access point; read the switch's",
    '`interfaces.ports` via `getDevice` and pick a port whose `poe.state` is "UP". `restartDevice`',
    'reboots an entire device and takes everything behind it offline — on a gateway that is the whole',
    "site, so confirm the target and the user's intent first.",
    '',
    "Important limitation: a device's `uplink` field gives only the `deviceId` of the switch or",
    'gateway it connects to, never the port index on that upstream device. Nothing in this API',
    'resolves "which port powers access point X". Do not guess a port index in order to power-cycle a',
    'specific device — cycling the wrong port reboots an unrelated camera or AP. Either ask the user',
    'which port, or use `restartDevice` on the device itself, which needs no port number.',
    '',
    '`authorizeGuestAccess` and `unauthorizeGuestAccess` control guest-network access for a client',
    'found via `listClients`. The optional limits on authorization are inherited from the site guest',
    'policy when omitted.',
    '',
    '### Snapshots are expensive and have two preconditions',
    '`getCameraSnapshot` returns a base64 JPEG that is large and unreadable as text. Only call it',
    'when the image will actually be processed downstream, and consider `movePtzCameraToPreset`',
    'first if the camera needs repositioning.',
    '',
    'Two failures here are environmental rather than agent mistakes, so do not retry blindly.',
    'A response-size error means the operator has not raised `xpack.actions.maxResponseContentLength`',
    'above its 1mb default; real snapshots exceed that, and no retry or parameter change will help.',
    'A bare HTTP 400 usually means `highQuality: true` was set on a camera whose',
    '`featureFlags.supportFullHdSnapshot` is false — retry without the flag rather than giving up,',
    'and check the flag via `getProtectDevice` before setting it.',
  ].join('\n'),
};
