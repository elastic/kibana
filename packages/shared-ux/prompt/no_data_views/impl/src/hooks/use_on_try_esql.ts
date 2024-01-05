/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useState } from 'react';
import { DISCOVER_ESQL_LOCATOR } from '@kbn/deeplinks-analytics';
import { DiscoverEsqlLocatorParams } from '@kbn/discover-plugin/common';

import { NavigateToAppFn, LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';

export interface UseOnTryEsqlParams {
  locatorClient?: LocatorClient;
  navigateToApp: NavigateToAppFn;
}

export const useOnTryEsql = ({ locatorClient, navigateToApp }: UseOnTryEsqlParams) => {
  const [onTryEsql, setOnTryEsql] = useState<(() => void) | undefined>();

  useEffect(() => {
    (async () => {
      const location = await locatorClient
        ?.get<DiscoverEsqlLocatorParams>(DISCOVER_ESQL_LOCATOR)
        ?.getLocation({});

      if (!location) {
        return;
      }

      const { app, path, state } = location;

      setOnTryEsql(() => () => navigateToApp(app, { path, state }));
    })();
  }, [locatorClient, navigateToApp]);

  return onTryEsql;
};
