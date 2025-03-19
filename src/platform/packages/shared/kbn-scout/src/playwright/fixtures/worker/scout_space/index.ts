/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { UiSettingValues } from '@kbn/test/src/kbn_client/kbn_client_ui_settings';

export interface ImportSavedObjects {
  type: string;
  destinationId: string;
  meta: { title: string };
}
export interface ImportExportResponse {
  successResults: ImportSavedObjects[];
}
export interface SavedObjectResponse {
  id: string;
  type: string;
  title: string;
}

export interface ScoutSpaceParallelFixture {
  id: string;
  savedObjects: {
    load: (path: string) => Promise<SavedObjectResponse[]>;
    cleanStandardList: () => Promise<void>;
  };
  uiSettings: {
    setDefaultIndex: (dataViewName: string) => Promise<void>;
    set: (values: UiSettingValues) => Promise<void>;
    unset: (...keys: string[]) => Promise<any[]>;
    setDefaultTime: ({ from, to }: { from: string; to: string }) => Promise<void>;
  };
}

export { scoutSpaceParallelFixture } from './parallel';
