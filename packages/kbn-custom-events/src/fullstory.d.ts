/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sha256 } from 'js-sha256'; // loaded here to reduce page load bundle size when FullStory is disabled
import type { PackageInfo } from '@kbn/config';

export interface FullStoryDeps {
  basePath: any;
  orgId: string;
  packageInfo: PackageInfo;
}

export type FullstoryUserVars = Record<string, any>;

export interface FullStoryApi {
  identify(userId: string, userVars?: FullstoryUserVars): void;
  setUserVars(userVars?: FullstoryUserVars): void;
  event(eventName: string, eventProperties: Record<string, any>): void;
}

export interface FullStoryService {
  fullStory: FullStoryApi;
  sha256: typeof sha256;
}

export declare function initializeFullStory(deps: FullStoryDeps): FullStoryService;
