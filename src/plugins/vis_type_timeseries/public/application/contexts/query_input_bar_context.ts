/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { IUiSettingsClient, SavedObjectsClientContract } from 'src/core/public';
import { IStorageWrapper } from 'src/plugins/kibana_utils/public';

export interface ICoreStartContext {
  appName: string;
  uiSettings: IUiSettingsClient;
  savedObjectsClient: SavedObjectsClientContract;
  storage: IStorageWrapper;
}

export const CoreStartContext = React.createContext<ICoreStartContext | null>(null);

export const CoreStartContextProvider = CoreStartContext.Provider;
