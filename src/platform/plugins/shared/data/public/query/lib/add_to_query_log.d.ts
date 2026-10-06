/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { Query } from '../../../common';
interface AddToQueryLogDependencies {
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
}
export declare function createAddToQueryLog({
  storage,
  uiSettings,
}: AddToQueryLogDependencies): (appName: string, { language, query }: Query) => void;
export {};
