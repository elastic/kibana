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

import { Duration, Moment } from 'moment';

// Ideally, we may want to obtain the type from the configSchema and exposeToBrowser keys...
export interface NewsfeedPluginBrowserConfig {
  service: {
    urlRoot: string;
    pathTemplate: string;
  };
  mainInterval: Duration; // how often to check last updated time
  fetchInterval: Duration; // how often to fetch remote service and set last updated
}

export interface ApiItem {
  hash: string;
  expire_on: Date;
  publish_on: Date;
  title: { [lang: string]: string };
  description: { [lang: string]: string };
  link_text: { [lang: string]: string };
  link_url: { [lang: string]: string };
  badge?: { [lang: string]: string } | null;
  languages?: string[] | null;
  image_url?: null; // not used phase 1
}

export interface NewsfeedItem {
  title: string;
  description: string;
  linkText: string;
  linkUrl: string;
  badge: string | null;
  publishOn: Moment;
  expireOn: Moment;
  hash: string;
}

export interface FetchResult {
  kibanaVersion: string;
  hasNew: boolean;
  feedItems: NewsfeedItem[];
  error: Error | null;
}
