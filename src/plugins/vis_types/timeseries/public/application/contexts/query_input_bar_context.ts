/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { IUiSettingsClient, SavedObjectsClientContract } from '@kbn/core/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

export interface ICoreStartContext {
  appName: string;
  uiSettings: IUiSettingsClient;
  savedObjectsClient: SavedObjectsClientContract;
  storage: IStorageWrapper;
}

export const CoreStartContext = React.createContext<ICoreStartContext | null>(null);

export const CoreStartContextProvider = CoreStartContext.Provider;
