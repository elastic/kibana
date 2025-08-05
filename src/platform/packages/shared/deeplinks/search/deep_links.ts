/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  SERVERLESS_ES_APP_ID,
  SERVERLESS_ES_CONNECTORS_ID,
  SERVERLESS_ES_WEB_CRAWLERS_ID,
  ENTERPRISE_SEARCH_APP_ID,
  ENTERPRISE_SEARCH_CONTENT_APP_ID,
  ENTERPRISE_SEARCH_APPLICATIONS_APP_ID,
  ENTERPRISE_SEARCH_ANALYTICS_APP_ID,
  ES_SEARCH_PLAYGROUND_ID,
  SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID,
  SEARCH_HOMEPAGE,
  SEARCH_INDICES_START,
  SEARCH_INDICES,
  SEARCH_INDICES_CREATE_INDEX,
  ES_SEARCH_SYNONYMS_ID,
  SEARCH_QUERY_RULES_ID,
  SEARCH_INDEX_MANAGEMENT,
} from './constants';

export type EnterpriseSearchApp = typeof ENTERPRISE_SEARCH_APP_ID;
export type EnterpriseSearchContentApp = typeof ENTERPRISE_SEARCH_CONTENT_APP_ID;
export type EnterpriseSearchApplicationsApp = typeof ENTERPRISE_SEARCH_APPLICATIONS_APP_ID;
export type EnterpriseSearchAnalyticsApp = typeof ENTERPRISE_SEARCH_ANALYTICS_APP_ID;
export type ServerlessSearchApp = typeof SERVERLESS_ES_APP_ID;
export type ConnectorsId = typeof SERVERLESS_ES_CONNECTORS_ID;
export type ServerlessWebCrawlers = typeof SERVERLESS_ES_WEB_CRAWLERS_ID;
export type SearchPlaygroundId = typeof ES_SEARCH_PLAYGROUND_ID;
export type SearchInferenceEndpointsId = typeof SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID;
export type SearchSynonymsId = typeof ES_SEARCH_SYNONYMS_ID;
export type SearchQueryRulesId = typeof SEARCH_QUERY_RULES_ID;
export type SearchHomepage = typeof SEARCH_HOMEPAGE;
export type SearchStart = typeof SEARCH_INDICES_START;
export type SearchIndices = typeof SEARCH_INDICES;
export type SearchIndexManagement = typeof SEARCH_INDEX_MANAGEMENT;

export type ContentLinkId = 'connectors' | 'webCrawlers';

export type ApplicationsLinkId = 'searchApplications';

export type SearchInferenceEndpointsLinkId = 'inferenceEndpoints';

export type SynonymsLinkId = 'synonyms';

export type SearchIndicesLinkId = typeof SEARCH_INDICES_CREATE_INDEX;

export type DeepLinkId =
  | EnterpriseSearchApp
  | EnterpriseSearchContentApp
  | EnterpriseSearchApplicationsApp
  | EnterpriseSearchAnalyticsApp
  | ServerlessSearchApp
  | ConnectorsId
  | ServerlessWebCrawlers
  | SearchPlaygroundId
  | SearchInferenceEndpointsId
  | SearchSynonymsId
  | SearchQueryRulesId
  | SearchHomepage
  | `${EnterpriseSearchContentApp}:${ContentLinkId}`
  | `${EnterpriseSearchApplicationsApp}:${ApplicationsLinkId}`
  | `${SearchInferenceEndpointsId}:${SearchInferenceEndpointsLinkId}`
  | `${SearchSynonymsId}:${SynonymsLinkId}`
  | SearchStart
  | SearchIndices
  | SearchIndexManagement
  | `${SearchIndices}:${SearchIndicesLinkId}`;
