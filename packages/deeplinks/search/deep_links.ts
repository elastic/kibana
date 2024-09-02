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

export type ContentLinkId = 'searchIndices' | 'connectors' | 'webCrawlers';

export type ApplicationsLinkId = 'searchApplications' | 'playground';

export type AppsearchLinkId = 'engines';

export type RelevanceLinkId = 'inferenceEndpoints';

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
  | `${EnterpriseSearchRelevanceApp}:${RelevanceLinkId}`;
