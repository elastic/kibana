/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** API host of each Falcon cloud. `custom` uses the connector's API URL setting instead. */
export const FALCON_CLOUD_HOSTS = {
  'us-1': 'api.crowdstrike.com',
  'us-2': 'api.us-2.crowdstrike.com',
  'us-3': 'api.us-3.crowdstrike.com',
  'eu-1': 'api.eu-1.crowdstrike.com',
  'us-gov-1': 'api.laggar.gcw.crowdstrike.com',
  'us-gov-2': 'api.us-gov-2.crowdstrike.mil',
} as const;

export const FALCON_CLOUDS = [
  'us-1',
  'us-2',
  'us-3',
  'eu-1',
  'us-gov-1',
  'us-gov-2',
  'custom',
] as const satisfies ReadonlyArray<keyof typeof FALCON_CLOUD_HOSTS | 'custom'>;

/** Every request has a 60-second timeout; RTR requests use their own timeout plus this margin. */
export const REQUEST_TIMEOUT_MS = 60_000;
export const RTR_TIMEOUT_MARGIN_MS = 30_000;

/** Retry: 4 attempts in total (3 retries), waits capped at 30 s. */
export const MAX_ATTEMPTS = 4;
export const MAX_RETRY_WAIT_MS = 30_000;
export const RETRY_JITTER_MAX_MS = 250;
export const SERVER_ERROR_STATUSES = [500, 502, 503, 504];

/**
 * Longest request URL the connector sends. Id lists travel as repeated query parameters
 * (`ids=a&ids=b`), so their cap comes from URL bytes: common front ends reject request lines
 * over 8 KiB. Detail lookups are split into chunks that stay under this budget.
 */
export const MAX_URL_BYTES = 8_000;

/** Falcon's offset paging on the alerts query route stops at 10,000 results. */
export const ALERTS_RESULT_WINDOW = 10_000;

/** Largest file or sample the connector moves through Kibana (1 MiB, Kibana's default response cap). */
export const MAX_FILE_BYTES = 1_048_576;
/** Base64 characters needed for MAX_FILE_BYTES bytes. */
export const MAX_FILE_BASE64_CHARS = 1_398_104;

/** RTR batch sessions are refreshed once a wait crosses this session age. */
export const RTR_SESSION_REFRESH_AFTER_MS = 5 * 60_000;
export const RTR_POLL_INTERVAL_MS = 2_000;
/** Upper bound on the output chunks (sequence_id) read for one single-host command. */
export const RTR_MAX_OUTPUT_CHUNKS = 100;
export const SANDBOX_POLL_INTERVAL_MS = 10_000;

export const DEVICE_ID_PATTERN = /^[0-9a-fA-F]{32}$/;
/** Host group and IOA rule group ids: letters and digits only. */
export const GROUP_ID_PATTERN = /^[A-Za-z0-9]+$/;
/** On-demand scan ids: letters, digits, - and _ (checked before the id goes into an FQL filter). */
export const SCAN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
/**
 * On-demand scan CPU priority: Falcon accepts 1 (lowest) to 5 (highest) and rejects a scan
 * without one ("0 is an invalid cpu priority, must be a number from 1 to 5", live US-2), so the
 * connector sends the lowest priority when none is given.
 */
export const SCAN_CPU_PRIORITY_MIN = 1;
export const SCAN_CPU_PRIORITY_MAX = 5;
export const SCAN_DEFAULT_CPU_PRIORITY = SCAN_CPU_PRIORITY_MIN;
/**
 * The pause duration Falcon applies to a scan sent without one (live US-2). Falcon rejects a
 * pause_duration above max_duration, so a smaller max_duration also lowers the pause.
 */
export const FALCON_DEFAULT_SCAN_PAUSE_DURATION = 2;
/** Scan paths are literal folders or files: Falcon rejects a wildcard as an invalid path character (live US-2). */
export const SCAN_PATH_PATTERN = /^[^*]+$/;
/** Next-Gen SIEM search ids: letters, digits, - and _ (checked before the id goes into the path). */
export const NGSIEM_SEARCH_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
/** Next-Gen SIEM time: now, a relative time (15m, 24h, 7d; units s m h d w y) or epoch milliseconds. */
export const NGSIEM_TIME_PATTERN = /^(now|\d+[smhdwy]|\d{13})$/;
/** The Next-Gen SIEM view every search runs on: it covers every repository the API client may read. */
export const NGSIEM_SEARCH_PATH = '/humio/api/v1/repositories/search-all/queryjobs';
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SHA256_PATTERN = /^[0-9a-fA-F]{64}$/;
export const MD5_PATTERN = /^[0-9a-fA-F]{32}$/;
export const FILE_HASH_PATTERN = /^(?:[0-9a-fA-F]{32}|[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/;
export const DOMAIN_PATTERN =
  /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z][A-Za-z0-9-]{0,62}$/;

const READ_ONLY_COMMANDS = [
  'cat',
  'cd',
  'clear',
  'env',
  'eventlog',
  'filehash',
  'getsid',
  'help',
  'history',
  'ipconfig',
  'ls',
  'mount',
  'netstat',
  'ps',
  'reg query',
];
const ACTIVE_RESPONDER_COMMANDS = [
  ...READ_ONLY_COMMANDS,
  'cp',
  'encrypt',
  'get',
  'kill',
  'map',
  'memdump',
  'mkdir',
  'mv',
  'reg set',
  'reg delete',
  'reg load',
  'reg unload',
  'restart',
  'rm',
  'runscript',
  'shutdown',
  'umount',
  'unmap',
  'update',
  'xmemdump',
  'zip',
];
/** put, put-and-run and run are administrator-only in Falcon's API reference and SDK. */
const ADMIN_COMMANDS = [...ACTIVE_RESPONDER_COMMANDS, 'put', 'put-and-run', 'run'];

export type RtrTier = 'read_only' | 'active_responder' | 'admin';

/** Commands each Real Time Response tier may run, checked before any session is opened. */
export const RTR_TIER_COMMANDS: Record<RtrTier, readonly string[]> = {
  read_only: READ_ONLY_COMMANDS,
  active_responder: ACTIVE_RESPONDER_COMMANDS,
  admin: ADMIN_COMMANDS,
};

export const RTR_TIER_LABELS: Record<RtrTier, string> = {
  read_only: 'read-only',
  active_responder: 'active responder',
  admin: 'administrator',
};

/** Batch command route of each tier. */
export const RTR_BATCH_COMMAND_PATHS: Record<RtrTier, string> = {
  read_only: '/real-time-response/combined/batch-command/v1',
  active_responder: '/real-time-response/combined/batch-active-responder-command/v1',
  admin: '/real-time-response/combined/batch-admin-command/v1',
};

/** Single-session command route of each tier (POST runs a command, GET reads its status). */
export const RTR_COMMAND_PATHS: Record<RtrTier, string> = {
  read_only: '/real-time-response/entities/command/v1',
  active_responder: '/real-time-response/entities/active-responder-command/v1',
  admin: '/real-time-response/entities/admin-command/v1',
};

/** The API client scope each action needs, named in 403 errors. */
export const SCOPES = {
  hostsRead: 'the Hosts: Read scope',
  hostsWrite: 'the Hosts: Write scope',
  hostGroupsRead: 'the Host groups: Read scope',
  alertsRead: 'the Alerts: Read scope',
  alertsWrite: 'the Alerts: Write scope',
  iocRead: 'the IOC Management: Read scope',
  iocWrite: 'the IOC Management: Write scope',
  iocHostsRead: 'the IOC Management: Read and Hosts: Read scopes',
  rtrRead: 'the Real time response: Read scope',
  rtrWrite: 'the Real time response: Write scope',
  rtrAdmin: 'the Real time response (admin): Write scope',
  quarantineRead: 'the Quarantined Files: Read scope',
  quarantineWrite: 'the Quarantined Files: Write scope',
  intelRead:
    'the Indicators (Falcon Intelligence): Read scope and a Falcon Intelligence subscription',
  sandboxWrite: 'the Sandbox (Falcon Sandbox): Write scope and a Falcon Sandbox subscription',
  sandboxSampleWrite:
    'the Sandbox (Falcon Sandbox): Write and Sample uploads: Write scopes and a Falcon Sandbox subscription',
  spotlightRead: 'the Vulnerabilities (Spotlight): Read scope and a Falcon Spotlight subscription',
  hostGroupsWrite: 'the Host groups: Write scope',
  casesRead: 'the Cases (Case Management): Read scope',
  casesWrite: 'the Cases (Case Management): Write scope',
  ioaRulesRead: 'the Custom IOA rules: Read scope',
  ioaRulesWrite: 'the Custom IOA rules: Write scope',
  ioaExclusionsRead: 'the IOA exclusions: Read scope',
  odsRead: 'the On-demand scans (ODS): Read scope',
  odsWrite: 'the On-demand scans (ODS): Write scope',
  ngsiemRead: 'the NGSIEM scope (console label NGSIEM, Read and Write; API scope humio-auth-proxy)',
} as const;

export const RTR_TIER_SCOPES: Record<RtrTier, string> = {
  read_only: SCOPES.rtrRead,
  active_responder: SCOPES.rtrWrite,
  admin: SCOPES.rtrAdmin,
};

/** Falcon containment status mapped to the names workflows use. */
export const CONTAINMENT_STATES: Record<string, string> = {
  normal: 'normal',
  containment_pending: 'containing',
  contained: 'contained',
  lift_containment_pending: 'lift_pending',
};

export const INTEL_CONFIDENCE_ORDER = ['high', 'medium', 'low', 'unverified'];
