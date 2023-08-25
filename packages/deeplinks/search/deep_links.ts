/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  SERVERLESS_ES_APP_ID,
  SERVERLESS_ES_CONNECTORS_ID,
  SERVERLESS_ES_INDEXING_API_ID,
} from './constants';

export type AppId = typeof SERVERLESS_ES_APP_ID;
export type IndexingApiId = typeof SERVERLESS_ES_INDEXING_API_ID;
export type ConnectorsId = typeof SERVERLESS_ES_CONNECTORS_ID;

export type DeepLinkId = AppId | IndexingApiId | ConnectorsId;
