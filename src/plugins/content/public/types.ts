/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {ContentService} from "./service/content_service";

export interface ContentPluginSetup {
  content: ReturnType<ContentService['setup']>;
}

export interface ContentPluginStart {
  content: ReturnType<ContentService['start']>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface AppPluginStartDependencies {}
