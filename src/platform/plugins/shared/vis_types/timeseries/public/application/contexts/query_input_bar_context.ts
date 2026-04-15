/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { CoreStart, IUiSettingsClient } from '@kbn/core/public';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { KqlPluginStart } from '@kbn/kql/public';

export interface ICoreStartContext {
  appName: string;
  uiSettings: IUiSettingsClient;
  storage: IStorageWrapper;
  core: CoreStart;
  kql: KqlPluginStart;
  data: DataPublicPluginStart;
}

export const CoreStartContext = React.createContext<ICoreStartContext>({} as ICoreStartContext);

export const CoreStartContextProvider = CoreStartContext.Provider;
