/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_FILTER_LENGTH = 1000;
const MAX_PAGE_LIMIT = 200;

/**
 * Network resource IDs (site, device, client) are documented as `format: uuid` in the
 * Network OpenAPI spec. Constrain them to the UUID character set so they can't smuggle
 * path separators or filter syntax when interpolated into a request URL.
 */
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Protect IDs are opaque 24-character hex-ish strings (e.g. `66d025b301ebc903e80003ea`).
 * The spec does not publish a format, so bound the length and restrict to alphanumerics.
 */
const PROTECT_ID_REGEX = /^[0-9a-zA-Z]{1,64}$/;

/**
 * The Network API's `filter` query parameter uses its own expression grammar (documented at
 * https://developer.ui.com/network/v10.4.57/filtering), not Lucene/KQL. Repeating the syntax
 * on every list action's `filter` param is what stops an agent from guessing `name=foo` or
 * `name:foo`, both of which the API rejects.
 */
const FILTER_DESCRIPTION = [
  'Optional server-side filter using the UniFi Network filter grammar (NOT KQL or Lucene).',
  "Property expression: property.function(arguments), e.g. name.eq('Office AP') or state.in('ONLINE','OFFLINE').",
  "Compound: and(...) / or(...), e.g. and(name.like('guest*'), firmwareUpdatable.eq(true)).",
  "Negation: not(name.like('guest*')).",
  'String arguments must be wrapped in single quotes; escape a single quote by doubling it.',
  'Timestamps are ISO 8601 (2025-01-29 or 2025-01-29T12:39:11Z); UUIDs are unquoted.',
  'Available functions: eq, ne, gt, ge, lt, le, like, in, notIn, isNull, isNotNull, isEmpty,',
  'contains, containsAny, containsAll, containsExactly. Which properties and functions are valid',
  'differs per endpoint — start without a filter to see the returned fields, then filter on those.',
].join(' ');

const SiteIdSchema = z
  .string()
  .regex(UUID_REGEX, 'Must be a UUID.')
  .describe(
    'The site UUID, returned by the listSites action. Most Network actions are site-scoped.'
  );

const OffsetSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe(
    'Zero-based index of the first result to return. Defaults to 0. Use with `limit` to page through results using `totalCount` from the response.'
  );

const LimitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_PAGE_LIMIT)
  .optional()
  .describe(
    `Maximum number of results to return (1–${MAX_PAGE_LIMIT}). Defaults to 25 on the server.`
  );

const FilterSchema = z.string().max(MAX_FILTER_LENGTH).optional().describe(FILTER_DESCRIPTION);

// ============================================================================
// UniFi Network — reads
// ============================================================================

export const UnifiListSitesInputSchema = lazySchema(() =>
  z.object({
    offset: OffsetSchema,
    limit: LimitSchema,
    filter: FilterSchema,
  })
);
export type UnifiListSitesInput = z.infer<typeof UnifiListSitesInputSchema>;

export const UnifiListDevicesInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    offset: OffsetSchema,
    limit: LimitSchema,
    filter: FilterSchema,
  })
);
export type UnifiListDevicesInput = z.infer<typeof UnifiListDevicesInputSchema>;

export const UnifiGetDeviceInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    deviceId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe('The adopted device UUID, returned in the `id` field by listDevices.'),
  })
);
export type UnifiGetDeviceInput = z.infer<typeof UnifiGetDeviceInputSchema>;

export const UnifiListClientsInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    offset: OffsetSchema,
    limit: LimitSchema,
    filter: FilterSchema,
  })
);
export type UnifiListClientsInput = z.infer<typeof UnifiListClientsInputSchema>;

export const UnifiGetClientInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    clientId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe('The connected client UUID, returned in the `id` field by listClients.'),
  })
);
export type UnifiGetClientInput = z.infer<typeof UnifiGetClientInputSchema>;

export const UnifiSitePageInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    offset: OffsetSchema,
    limit: LimitSchema,
  })
);
export type UnifiSitePageInput = z.infer<typeof UnifiSitePageInputSchema>;

export const UnifiSiteFilterablePageInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    offset: OffsetSchema,
    limit: LimitSchema,
    filter: FilterSchema,
  })
);
export type UnifiSiteFilterablePageInput = z.infer<typeof UnifiSiteFilterablePageInputSchema>;

// ============================================================================
// UniFi Network — control actions
// ============================================================================

export const UnifiRestartDeviceInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    deviceId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe('The adopted device UUID to restart, returned by listDevices.'),
  })
);
export type UnifiRestartDeviceInput = z.infer<typeof UnifiRestartDeviceInputSchema>;

export const UnifiPowerCyclePortInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    deviceId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe(
        'The UUID of the switch whose port should be power-cycled, returned by listDevices.'
      ),
    portIdx: z
      .number()
      .int()
      .min(1)
      .max(1024)
      .describe(
        "The 1-based physical port number to PoE power-cycle, as shown in the device's `interfaces.ports` list from getDevice."
      ),
  })
);
export type UnifiPowerCyclePortInput = z.infer<typeof UnifiPowerCyclePortInputSchema>;

export const UnifiAuthorizeGuestAccessInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    clientId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe('The UUID of the guest client to authorize, returned by listClients.'),
    timeLimitMinutes: z
      .number()
      .int()
      .min(1)
      .max(1000000)
      .optional()
      .describe(
        "How long the guest stays authorized, in minutes (1–1000000). Omit to use the site's default guest policy."
      ),
    dataUsageLimitMBytes: z
      .number()
      .int()
      .min(1)
      .max(1048576)
      .optional()
      .describe(
        'Total data allowance for the session, in megabytes (1–1048576). Omit for no connector-imposed cap.'
      ),
    rxRateLimitKbps: z
      .number()
      .int()
      .min(2)
      .max(100000)
      .optional()
      .describe('Download rate limit in kilobits per second (2–100000). Omit for unlimited.'),
    txRateLimitKbps: z
      .number()
      .int()
      .min(2)
      .max(100000)
      .optional()
      .describe('Upload rate limit in kilobits per second (2–100000). Omit for unlimited.'),
  })
);
export type UnifiAuthorizeGuestAccessInput = z.infer<typeof UnifiAuthorizeGuestAccessInputSchema>;

export const UnifiUnauthorizeGuestAccessInputSchema = lazySchema(() =>
  z.object({
    siteId: SiteIdSchema,
    clientId: z
      .string()
      .regex(UUID_REGEX, 'Must be a UUID.')
      .describe(
        'The UUID of the guest client to unauthorize and disconnect, returned by listClients.'
      ),
  })
);
export type UnifiUnauthorizeGuestAccessInput = z.infer<
  typeof UnifiUnauthorizeGuestAccessInputSchema
>;

// ============================================================================
// UniFi Protect
// ============================================================================

/**
 * Every Protect device family is exposed as the same `GET /v1/{collection}` +
 * `GET /v1/{collection}/{id}` pair, so they are consolidated into two actions with a
 * `deviceType` discriminator rather than 24 near-identical tools. These strings are the
 * literal URL path segments — note the hyphenated forms.
 */
export const PROTECT_DEVICE_TYPES = [
  'cameras',
  'lights',
  'sensors',
  'chimes',
  'sirens',
  'speakers',
  'viewers',
  'fobs',
  'relays',
  'bridges',
  'link-stations',
  'alarm-hubs',
] as const;

const ProtectDeviceTypeSchema = z
  .enum(PROTECT_DEVICE_TYPES)
  .describe(
    `The Protect device family to query. One of: ${PROTECT_DEVICE_TYPES.join(
      ', '
    )}. Use "cameras" for video devices, "sensors" for UniFi Protect sensors (door/motion/leak), "alarm-hubs" for keypads/hubs, and "link-stations" for AI LiteStation-class devices.`
  );

const ProtectDeviceIdSchema = z
  .string()
  .regex(PROTECT_ID_REGEX, 'Must be an alphanumeric Protect device ID.')
  .describe(
    'The Protect device ID, returned in the `id` field by listProtectDevices, e.g. "66d025b301ebc903e80003ea".'
  );

export const UnifiListProtectDevicesInputSchema = lazySchema(() =>
  z.object({
    deviceType: ProtectDeviceTypeSchema,
  })
);
export type UnifiListProtectDevicesInput = z.infer<typeof UnifiListProtectDevicesInputSchema>;

export const UnifiGetProtectDeviceInputSchema = lazySchema(() =>
  z.object({
    deviceType: ProtectDeviceTypeSchema,
    deviceId: ProtectDeviceIdSchema,
  })
);
export type UnifiGetProtectDeviceInput = z.infer<typeof UnifiGetProtectDeviceInputSchema>;

export const UnifiGetCameraSnapshotInputSchema = lazySchema(() =>
  z.object({
    cameraId: z
      .string()
      .regex(PROTECT_ID_REGEX, 'Must be an alphanumeric Protect camera ID.')
      .describe('The camera ID, returned by listProtectDevices with deviceType "cameras".'),
    channel: z
      .enum(['main', 'package'])
      .optional()
      .describe(
        'Which camera channel to capture. Defaults to "main". Use "package" only for cameras whose details report `hasPackageCamera: true`.'
      ),
    highQuality: z
      .boolean()
      .optional()
      .describe(
        'Force a 1080p-or-higher snapshot instead of the default resolution. Larger payload; defaults to false. Only set this to true for cameras whose getProtectDevice details report `featureFlags.supportFullHdSnapshot: true` — the API rejects it with a bare HTTP 400 on cameras that do not, and the error does not explain why. Cameras that already support full HD return a full-resolution image without this flag, so leaving it unset is almost always correct.'
      ),
  })
);
export type UnifiGetCameraSnapshotInput = z.infer<typeof UnifiGetCameraSnapshotInputSchema>;

export const UnifiMovePtzCameraInputSchema = lazySchema(() =>
  z.object({
    cameraId: z
      .string()
      .regex(PROTECT_ID_REGEX, 'Must be an alphanumeric Protect camera ID.')
      .describe('The PTZ camera ID, returned by listProtectDevices with deviceType "cameras".'),
    slot: z
      .string()
      .regex(/^-?\d{1,4}$/, 'Must be an integer preset slot, e.g. "-1", "0" or "2".')
      .describe(
        'The preset slot to move to, as a string. "-1" is the home preset; "0" and above are user-configured presets. The camera\'s `activePatrolSlot` field shows the currently active slot.'
      ),
  })
);
export type UnifiMovePtzCameraInput = z.infer<typeof UnifiMovePtzCameraInputSchema>;
