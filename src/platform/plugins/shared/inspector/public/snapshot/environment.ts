/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod';

/** Build information of the Kibana instance a snapshot was exported from. */
export interface SnapshotKibanaInfo {
  version: string;
  branch?: string;
  buildNum?: number;
  buildSha?: string;
  buildDate?: string;
  buildFlavor?: string;
}

interface Size {
  width: number;
  height: number;
}

/** Browser and device information of the session a snapshot was exported from. */
export interface SnapshotBrowserInfo {
  name?: string;
  version?: string;
  os?: string;
  userAgent?: string;
  language?: string;
  languages?: string[];
  screen?: Size;
  viewport?: Size;
  devicePixelRatio?: number;
}

/** Environment fields stored in the snapshot meta, next to version/time/title. */
export interface SnapshotEnvironment {
  kibana?: SnapshotKibanaInfo;
  browser?: SnapshotBrowserInfo;
  locale?: string;
  spaceId?: string;
  origin?: string;
  /** Set when the exported requests were themselves replayed from an earlier snapshot */
  restoredFrom?: { createdAt: string; kibanaVersion?: string };
}

// Environment info is informational only: invalid values are dropped instead of failing the import.
const lenient = <T extends z.ZodTypeAny>(schema: T) => schema.optional().catch(undefined);
const sizeSchema = lazySchema(() => z.object({ width: z.number(), height: z.number() }));

export const snapshotEnvironmentSchema = {
  kibana: lenient(
    z.object({
      version: z.string(),
      branch: lenient(z.string()),
      buildNum: lenient(z.number()),
      buildSha: lenient(z.string()),
      buildDate: lenient(z.string()),
      buildFlavor: lenient(z.string()),
    })
  ),
  browser: lenient(
    z.object({
      name: lenient(z.string()),
      version: lenient(z.string()),
      os: lenient(z.string()),
      userAgent: lenient(z.string()),
      language: lenient(z.string()),
      languages: lenient(z.array(z.string())),
      screen: lenient(sizeSchema),
      viewport: lenient(sizeSchema),
      devicePixelRatio: lenient(z.number()),
    })
  ),
  locale: lenient(z.string()),
  spaceId: lenient(z.string()),
  origin: lenient(z.string()),
  restoredFrom: lenient(z.object({ createdAt: z.string(), kibanaVersion: lenient(z.string()) })),
};

const BROWSERS: Array<[name: string, pattern: RegExp]> = [
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari\//],
];

const OPERATING_SYSTEMS: Array<[name: string, pattern: RegExp]> = [
  ['Windows', /Windows NT/],
  ['iOS', /iPhone|iPad|iPod/],
  ['Android', /Android/],
  ['macOS', /Mac OS X|Macintosh/],
  ['ChromeOS', /CrOS/],
  ['Linux', /Linux/],
];

/** Extracts browser name/version and operating system from a user agent string. */
export const parseUserAgent = (
  userAgent: string
): Pick<SnapshotBrowserInfo, 'name' | 'version' | 'os'> => {
  const browser = BROWSERS.find(([, pattern]) => pattern.test(userAgent));
  const os = OPERATING_SYSTEMS.find(([, pattern]) => pattern.test(userAgent));
  return {
    name: browser?.[0],
    version: browser ? userAgent.match(browser[1])?.[1] : undefined,
    os: os?.[0],
  };
};

export const getBrowserInfo = (win: Window = window): SnapshotBrowserInfo => {
  const { navigator, screen } = win;
  return {
    ...parseUserAgent(navigator.userAgent),
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: [...(navigator.languages ?? [])],
    screen: screen ? { width: screen.width, height: screen.height } : undefined,
    viewport: { width: win.innerWidth, height: win.innerHeight },
    devicePixelRatio: win.devicePixelRatio,
  };
};

/** Returns the space id from a base path like `/mybase/s/marketing`, `default` otherwise. */
export const getSpaceId = (basePath: string, serverBasePath: string = '') => {
  const path = basePath.startsWith(serverBasePath)
    ? basePath.slice(serverBasePath.length)
    : basePath;
  return path.match(/^\/s\/([^/]+)/)?.[1] ?? 'default';
};

export interface EnvironmentDetail {
  id: string;
  label: string;
  value: string;
  /** Value of the current session, set only when it differs from the snapshot. */
  current?: string;
}

type DetailSource = SnapshotEnvironment & { kibanaVersion?: string; timezone?: string };

/** Formats an ISO date for display, undefined for missing or invalid dates. */
export const formatSnapshotDate = (value?: string) => {
  const date = value ? new Date(value) : undefined;
  return date && !isNaN(date.getTime()) ? date.toLocaleString() : undefined;
};

/** Title of an exported snapshot, e.g. "Snapshot from 11/8/2026, 10:54:05 PM, Kibana 9.7.0". */
export const getSnapshotTitle = (
  meta: { createdAt?: string; kibanaVersion?: string },
  prefix = 'Snapshot'
) =>
  [
    `${prefix}${
      meta.createdAt && formatSnapshotDate(meta.createdAt)
        ? ` from ${formatSnapshotDate(meta.createdAt)}`
        : ''
    }`,
    meta.kibanaVersion ? `Kibana ${meta.kibanaVersion}` : undefined,
  ]
    .filter(Boolean)
    .join(', ');

const formatSize = (size?: Size) => (size ? `${size.width} × ${size.height}` : undefined);

const formatKibana = (meta: DetailSource, withFlavor = true) => {
  const { kibana } = meta;
  const version = kibana?.version || meta.kibanaVersion;
  if (!version) {
    return undefined;
  }
  const flavor = withFlavor && kibana?.buildFlavor === 'serverless' ? 'Serverless' : undefined;
  return [version, flavor].filter(Boolean).join(' · ');
};

const formatBuild = ({ kibana }: DetailSource) => {
  if (!kibana) {
    return undefined;
  }
  const parts = [
    kibana.buildNum !== undefined ? `#${kibana.buildNum}` : undefined,
    kibana.buildSha?.slice(0, 12),
    kibana.branch ? `branch ${kibana.branch}` : undefined,
    formatSnapshotDate(kibana.buildDate),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
};

const formatBrowser = ({ browser }: DetailSource) =>
  browser?.name ? [browser.name, browser.version].filter(Boolean).join(' ') : undefined;

const DETAILS: Array<{
  id: string;
  label: string;
  format: (meta: DetailSource) => string | undefined;
  compare?: boolean;
  /** Formats the current session's value for the comparison, defaults to `format` */
  formatCurrent?: (current: DetailSource, snapshot: DetailSource) => string | undefined;
}> = [
  {
    id: 'kibana',
    label: 'Kibana',
    format: formatKibana,
    compare: true,
    // Older snapshots have no build flavor, so only compare it when the snapshot has one
    formatCurrent: (current, snapshot) =>
      formatKibana(current, Boolean(snapshot.kibana?.buildFlavor)),
  },
  { id: 'build', label: 'Build', format: formatBuild },
  {
    id: 'restoredFrom',
    label: 'Replayed from',
    format: ({ restoredFrom }) => (restoredFrom ? getSnapshotTitle(restoredFrom) : undefined),
  },
  { id: 'origin', label: 'Origin', format: (meta) => meta.origin, compare: true },
  { id: 'space', label: 'Space', format: (meta) => meta.spaceId, compare: true },
  { id: 'timezone', label: 'Time zone', format: (meta) => meta.timezone, compare: true },
  { id: 'locale', label: 'Kibana locale', format: (meta) => meta.locale, compare: true },
  { id: 'browser', label: 'Browser', format: formatBrowser, compare: true },
  { id: 'os', label: 'Operating system', format: (meta) => meta.browser?.os, compare: true },
  {
    id: 'language',
    label: 'Browser language',
    format: (meta) => meta.browser?.languages?.join(', ') || meta.browser?.language,
  },
  { id: 'screen', label: 'Screen', format: (meta) => formatSize(meta.browser?.screen) },
  {
    id: 'viewport',
    label: 'Window',
    format: ({ browser }) => {
      const size = formatSize(browser?.viewport);
      return size && browser?.devicePixelRatio ? `${size} @ ${browser.devicePixelRatio}x` : size;
    },
  },
  { id: 'userAgent', label: 'User agent', format: (meta) => meta.browser?.userAgent },
];

/** Human readable environment details of a snapshot, compared with the current session. */
export const getEnvironmentDetails = (
  meta: DetailSource,
  current?: DetailSource
): EnvironmentDetail[] =>
  DETAILS.flatMap(({ id, label, format, compare, formatCurrent = format }) => {
    const value = format(meta);
    if (!value) {
      return [];
    }
    const currentValue = compare && current ? formatCurrent(current, meta) : undefined;
    return [
      {
        id,
        label,
        value,
        ...(currentValue && currentValue !== value ? { current: currentValue } : {}),
      },
    ];
  });
