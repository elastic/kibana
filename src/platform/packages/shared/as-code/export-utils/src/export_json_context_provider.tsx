/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useContext } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { type SharePluginStart } from '@kbn/share-plugin/public';

interface Context {
  services: { share?: SharePluginStart; core: CoreStart };
}

export const ExportJsonFlyoutContext = React.createContext<Context | undefined>(undefined);

export const useExportJsonFlyoutContext = (): Context => {
  const exportJsonFlyoutContext = useContext(ExportJsonFlyoutContext);
  if (!exportJsonFlyoutContext)
    throw new Error(
      'No ExportJsonFlyoutContext.Provider found when calling useExportJsonFlyoutContext.'
    );
  return exportJsonFlyoutContext;
};
