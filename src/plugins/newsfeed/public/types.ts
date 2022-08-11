/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Duration, Moment } from 'moment';
import type { ScreenshotModePluginStart } from '@kbn/screenshot-mode-plugin/public';
export interface NewsfeedPluginStartDependencies {
  screenshotMode: ScreenshotModePluginStart;
}

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
  link_text?: { [lang: string]: string };
  link_url: { [lang: string]: string };
  badge?: { [lang: string]: string } | null;
  languages?: string[] | null;
  image_url?: null; // not used phase 1
}

export interface NewsfeedItem {
  title: string;
  description: string;
  linkText: string | null;
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
