/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';

/**
 * Value list routes
 */
export const LIST_URL = '/api/lists';
export const LIST_INDEX = `${LIST_URL}/index`;
export const LIST_ITEM_URL = `${LIST_URL}/items`;
export const LIST_PRIVILEGES_URL = `${LIST_URL}/privileges`;

/**
 * Internal value list routes
 */
export const INTERNAL_LIST_URL = '/internal/lists';
export const FIND_LISTS_BY_SIZE = `${INTERNAL_LIST_URL}/_find_lists_by_size` as const;
export const EXCEPTION_FILTER = `${INTERNAL_LIST_URL}/_create_filter` as const;

/**
 * Exception list routes
 */
export const EXCEPTION_LIST_URL = '/api/exception_lists';
export const EXCEPTION_LIST_ITEM_URL = '/api/exception_lists/items';

/**
 * Internal exception list routes
 */
export const INTERNAL_EXCEPTION_LIST_URL = `/internal${EXCEPTION_LIST_URL}`;
export const INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL = `${INTERNAL_EXCEPTION_LIST_URL}/_create`;

/**
 * Exception list spaces
 */
export const EXCEPTION_LIST_NAMESPACE_AGNOSTIC = 'exception-list-agnostic';
export const EXCEPTION_LIST_NAMESPACE = 'exception-list';

/**
 * Specific routes for the single global space agnostic endpoint list
 */
export const ENDPOINT_LIST_URL = '/api/endpoint_list';

/**
 * Specific routes for the single global space agnostic endpoint list. These are convenience
 * routes where they are going to try and create the global space agnostic endpoint list if it
 * does not exist yet or if it was deleted at some point and re-create it before adding items to
 * the list
 */
export const ENDPOINT_LIST_ITEM_URL = '/api/endpoint_list/items';

/**
 * This ID is used for _both_ the Saved Object ID and for the list_id
 * for the single global space agnostic endpoint list
 */
export const ENDPOINT_LIST_ID = 'endpoint_list';

/** The name of the single global space agnostic endpoint list */
export const ENDPOINT_LIST_NAME = 'Endpoint Security Exception List';

/** The description of the single global space agnostic endpoint list */
export const ENDPOINT_LIST_DESCRIPTION = 'Endpoint Security Exception List';

export const MAX_EXCEPTION_LIST_SIZE = 10000;

export const MAXIMUM_SMALL_VALUE_LIST_SIZE = 65536;

export const MAXIMUM_SMALL_IP_RANGE_VALUE_LIST_DASH_SIZE = 200;

/**
 * List definitions for Endpoint Artifact
 */
export const ENDPOINT_ARTIFACT_LISTS = deepFreeze({
  trustedApps: {
    id: 'endpoint_trusted_apps',
    name: 'Endpoint Security Trusted Apps List',
    description: 'Endpoint Security Trusted Apps List',
  },
  eventFilters: {
    id: 'endpoint_event_filters',
    name: 'Endpoint Security Event Filters List',
    description: 'Endpoint Security Event Filters List',
  },
  hostIsolationExceptions: {
    id: 'endpoint_host_isolation_exceptions',
    name: 'Endpoint Security Host isolation exceptions List',
    description: 'Endpoint Security Host isolation exceptions List',
  },
  blocklists: {
    id: 'endpoint_blocklists',
    name: 'Endpoint Security Blocklists List',
    description: 'Endpoint Security Blocklists List',
  },
});

/**
 * The IDs of all Endpoint artifact lists
 */
export const ENDPOINT_ARTIFACT_LIST_IDS = Object.freeze(
  Object.values(ENDPOINT_ARTIFACT_LISTS).map(({ id }) => id)
);

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_TRUSTED_APPS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.trustedApps.id;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_TRUSTED_APPS_LIST_NAME = ENDPOINT_ARTIFACT_LISTS.trustedApps.name;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_TRUSTED_APPS_LIST_DESCRIPTION =
  ENDPOINT_ARTIFACT_LISTS.trustedApps.description;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_EVENT_FILTERS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.eventFilters.id;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_EVENT_FILTERS_LIST_NAME = ENDPOINT_ARTIFACT_LISTS.eventFilters.name;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_EVENT_FILTERS_LIST_DESCRIPTION =
  ENDPOINT_ARTIFACT_LISTS.eventFilters.description;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID =
  ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.id;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_NAME =
  ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.name;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_DESCRIPTION =
  ENDPOINT_ARTIFACT_LISTS.hostIsolationExceptions.description;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_BLOCKLISTS_LIST_ID = ENDPOINT_ARTIFACT_LISTS.blocklists.id;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_BLOCKLISTS_LIST_NAME = ENDPOINT_ARTIFACT_LISTS.blocklists.name;

/** @deprecated Use `ENDPOINT_ARTIFACT_LISTS` instead */
export const ENDPOINT_BLOCKLISTS_LIST_DESCRIPTION = ENDPOINT_ARTIFACT_LISTS.blocklists.description;
