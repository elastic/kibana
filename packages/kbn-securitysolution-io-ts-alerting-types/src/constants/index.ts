/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This ID is used for _both_ the Saved Object ID and for the list_id
 * for the single global space agnostic endpoint list
 * TODO: Create a kbn-securitysolution-constants and add this to it.
 * @deprecated Use the ENDPOINT_LIST_ID from the kbn-securitysolution-constants.
 */
export const ENDPOINT_LIST_ID = 'endpoint_list';

/**
 * TODO: Create a kbn-securitysolution-constants and add this to it.
 * @deprecated Use the DEFAULT_MAX_SIGNALS from the kbn-securitysolution-constants.
 */
export const DEFAULT_MAX_SIGNALS = 100;
