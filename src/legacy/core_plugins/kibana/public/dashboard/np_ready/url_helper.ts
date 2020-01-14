/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { parse } from 'url';
import { absoluteToParsedUrl } from '../legacy_imports';
import { DashboardConstants } from './dashboard_constants';
/**
 * Return query params from URL
 * @param url given url
 */
export function getUrlVars(url: string): Record<string, string> {
  const vars: Record<string, string> = {};
  // @ts-ignore
  url.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(_, key, value) {
    // @ts-ignore
    vars[key] = decodeURIComponent(value);
  });
  return vars;
}

/** *
 * Returns dashboard URL with added embeddableType and embeddableId query params
 * eg.
 * input: url: http://localhost:5601/lib/app/kibana#/dashboard?_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now)), embeddableId: 12345, embeddableType: 'lens'
 * output: http://localhost:5601/lib/app/kibana#dashboard?addEmbeddableType=lens&addEmbeddableId=12345&_g=(refreshInterval:(pause:!t,value:0),time:(from:now-15m,to:now))
 * @param url dasbhoard absolute url
 * @param embeddableId id of the saved visualization
 * @param basePath current base path
 * @param urlVars url query params (optional)
 * @param embeddableType 'lens' or 'visualization' (optional, default is 'lens')
 */
export function addEmbeddableToDashboardUrl(
  url: string | undefined,
  basePath: string,
  embeddableId: string,
  urlVars?: Record<string, string>,
  embeddableType?: string
): string | null {
  if (!url) {
    return null;
  }
  const dashboardUrl = getUrlWithoutQueryParams(url);
  const dashboardParsedUrl = absoluteToParsedUrl(dashboardUrl, basePath);
  if (urlVars) {
    const keys = Object.keys(urlVars).sort();
    keys.forEach(key => {
      dashboardParsedUrl.addQueryParameter(key, urlVars[key]);
    });
  }
  dashboardParsedUrl.addQueryParameter(
    DashboardConstants.ADD_EMBEDDABLE_TYPE,
    embeddableType || 'lens'
  );
  dashboardParsedUrl.addQueryParameter(DashboardConstants.ADD_EMBEDDABLE_ID, embeddableId);
  return dashboardParsedUrl.getAbsoluteUrl();
}

/**
 * Return Lens URL from dashboard absolute URL
 * @param dashboardAbsoluteUrl
 * @param basePath current base path
 * @param id Lens id
 */
export function getLensUrlFromDashboardAbsoluteUrl(
  dashboardAbsoluteUrl: string | undefined | null,
  basePath: string | null | undefined,
  id: string
): string | null {
  if (!dashboardAbsoluteUrl || basePath === null || basePath === undefined) {
    return null;
  }
  const { host, protocol } = parse(dashboardAbsoluteUrl);
  return `${protocol}//${host}${basePath}/app/kibana#/lens/edit/${id}`;
}

/**
 * Returns the portion of the URL without query params
 * eg.
 * input: http://localhost:5601/lib/app/kibana#/dashboard?param1=x&param2=y&param3=z
 * output:http://localhost:5601/lib/app/kibana#/dashboard
 * input: http://localhost:5601/lib/app/kibana#/dashboard/39292992?param1=x&param2=y&param3=z
 * output: http://localhost:5601/lib/app/kibana#/dashboard/39292992
 * @param url url to parse
 */
function getUrlWithoutQueryParams(url: string): string {
  return url.split('?')[0];
}
