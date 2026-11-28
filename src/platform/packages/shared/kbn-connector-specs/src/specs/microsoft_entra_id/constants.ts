/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const MICROSOFT_ENTRA_ID_CONNECTOR_TYPE_ID = '.microsoft_entra_id';

/** Global Microsoft Graph host. National clouds use their own host (config `graphBaseUrl`). */
export const DEFAULT_GRAPH_BASE_URL = 'https://graph.microsoft.com';
export const GRAPH_DEFAULT_SCOPE = 'https://graph.microsoft.com/.default';
export const TOKEN_URL_PLACEHOLDER =
  'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token';

/** Every action except the raw request calls v1.0. */
export const GRAPH_VERSION = 'v1.0';
/** Values of the useBeta setting (a select: the connector form has no boolean widget). */
export const USE_BETA_VALUES = ['false', 'true'] as const;

/** Properties getUser and listUsers return when the caller gives no `select`. */
export const DEFAULT_USER_SELECT = [
  'id',
  'userPrincipalName',
  'displayName',
  'mail',
  'accountEnabled',
  'department',
  'jobTitle',
  'signInSessionsValidFromDateTime',
  'lastPasswordChangeDateTime',
];

// Bounds. Graph documents 999 as the page-size maximum for users, groups, memberships and
// members, and 500 for risky users. App role assignments document none: 999 is kept as a
// connector bound above any realistic page.
export const MAX_PAGE_SIZE = 999;
export const MAX_RISKY_USERS_PAGE_SIZE = 500;
export const MAX_SELECT_PROPERTIES = 40;
/** Not a documented Graph limit; a connector bound kept until a live check shows Graph's own. */
export const MAX_RISKY_USER_IDS = 60;
export const MAX_ODATA_EXPRESSION_LENGTH = 256;
export const MAX_NEXT_LINK_LENGTH = 4096;
export const MAX_USER_ID_LENGTH = 256;
export const MAX_RAW_PATH_LENGTH = 2048;
export const MAX_RAW_QUERY_ENTRIES = 30;
export const MAX_UPDATE_PROPERTIES = 50;
/** Serialized size bound for free-form JSON bodies, in UTF-8 bytes. */
export const MAX_JSON_BODY_BYTES = 256 * 1024;

// Request timing. Kibana ends a direct execute call near 120 s, so the whole action
// (all its requests and retry waits) stays within ACTION_TIME_BUDGET_MS.
export const REQUEST_TIMEOUT_MS = 30_000;
export const ACTION_TIME_BUDGET_MS = 90_000;
export const MAX_ATTEMPTS = 3;
export const RETRY_AFTER_CAP_MS = 60_000;
export const RETRY_BACKOFF_MS = [2_000, 5_000, 15_000];
export const RETRY_JITTER_MS = 500;
/** Pages read when an action has to see every app role assignment of a user. */
export const MAX_ASSIGNMENT_PAGES = 10;

/** Deletable authentication method types and their collection segment under /authentication. */
export const DELETABLE_METHOD_TYPES = [
  'fido2',
  'email',
  'microsoftAuthenticator',
  'phone',
  'softwareOath',
  'windowsHelloForBusiness',
  'temporaryAccessPass',
] as const;
export type DeletableMethodType = (typeof DELETABLE_METHOD_TYPES)[number];

export const GUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
/** OData property names for $select (also blocks query syntax injection). */
export const PROPERTY_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
