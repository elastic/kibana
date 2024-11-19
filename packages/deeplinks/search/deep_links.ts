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
  ENTERPRISE_SEARCH_APP_ID,
  ENTERPRISE_SEARCH_CONTENT_APP_ID,
  ENTERPRISE_SEARCH_APPLICATIONS_APP_ID,
  ENTERPRISE_SEARCH_RELEVANCE_APP_ID,
  ENTERPRISE_SEARCH_ANALYTICS_APP_ID,
  ENTERPRISE_SEARCH_APPSEARCH_APP_ID,
  ENTERPRISE_SEARCH_WORKPLACESEARCH_APP_ID,
  SERVERLESS_ES_SEARCH_PLAYGROUND_ID,
  SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID,
  SEARCH_HOMEPAGE,
  SEARCH_INDICES_START,
  SEARCH_INDICES,
  SEARCH_INDICES_CREATE_INDEX,
  SEARCH_ELASTICSEARCH,
  SEARCH_VECTOR_SEARCH,
  SEARCH_SEMANTIC_SEARCH,
  SEARCH_AI_SEARCH,
} from './constants';

export type EnterpriseSearchApp = typeof ENTERPRISE_SEARCH_APP_ID;
export type EnterpriseSearchContentApp = typeof ENTERPRISE_SEARCH_CONTENT_APP_ID;
export type EnterpriseSearchApplicationsApp = typeof ENTERPRISE_SEARCH_APPLICATIONS_APP_ID;
export type EnterpriseSearchRelevanceApp = typeof ENTERPRISE_SEARCH_RELEVANCE_APP_ID;
export type EnterpriseSearchAnalyticsApp = typeof ENTERPRISE_SEARCH_ANALYTICS_APP_ID;
export type EnterpriseSearchAppsearchApp = typeof ENTERPRISE_SEARCH_APPSEARCH_APP_ID;
export type EnterpriseSearchWorkplaceSearchApp = typeof ENTERPRISE_SEARCH_WORKPLACESEARCH_APP_ID;
export type ServerlessSearchApp = typeof SERVERLESS_ES_APP_ID;
export type ConnectorsId = typeof SERVERLESS_ES_CONNECTORS_ID;
export type SearchPlaygroundId = typeof SERVERLESS_ES_SEARCH_PLAYGROUND_ID;
export type SearchInferenceEndpointsId = typeof SERVERLESS_ES_SEARCH_INFERENCE_ENDPOINTS_ID;
export type SearchHomepage = typeof SEARCH_HOMEPAGE;
export type SearchStart = typeof SEARCH_INDICES_START;
export type SearchIndices = typeof SEARCH_INDICES;
export type SearchElasticsearch = typeof SEARCH_ELASTICSEARCH;
export type SearchVectorSearch = typeof SEARCH_VECTOR_SEARCH;
export type SearchSemanticSearch = typeof SEARCH_SEMANTIC_SEARCH;
export type SearchAISearch = typeof SEARCH_AI_SEARCH;

export type ContentLinkId = 'searchIndices' | 'connectors' | 'webCrawlers';

export type ApplicationsLinkId = 'searchApplications' | 'playground';

export type AppsearchLinkId = 'engines';

export type RelevanceLinkId = 'inferenceEndpoints';

export type SearchIndicesLinkId = typeof SEARCH_INDICES_CREATE_INDEX;

export type DeepLinkId =
  | EnterpriseSearchApp
  | EnterpriseSearchContentApp
  | EnterpriseSearchApplicationsApp
  | EnterpriseSearchRelevanceApp
  | EnterpriseSearchAnalyticsApp
  | EnterpriseSearchAppsearchApp
  | EnterpriseSearchWorkplaceSearchApp
  | ServerlessSearchApp
  | ConnectorsId
  | SearchPlaygroundId
  | SearchInferenceEndpointsId
  | SearchHomepage
  | `${EnterpriseSearchContentApp}:${ContentLinkId}`
  | `${EnterpriseSearchApplicationsApp}:${ApplicationsLinkId}`
  | `${EnterpriseSearchAppsearchApp}:${AppsearchLinkId}`
  | `${EnterpriseSearchRelevanceApp}:${RelevanceLinkId}`
  | SearchStart
  | SearchIndices
  | SearchElasticsearch
  | SearchVectorSearch
  | SearchSemanticSearch
  | SearchAISearch
  | `${SearchIndices}:${SearchIndicesLinkId}`;
