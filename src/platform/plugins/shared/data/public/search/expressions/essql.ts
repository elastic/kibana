/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { StartServicesAccessor } from '@kbn/core/public';
import { UiSettingsCommon } from '../../../common';
import { DataPublicPluginStart, DataStartDependencies } from '../../types';
import { getEssqlFn } from '../../../common/search/expressions/essql';

/**
 * This is some glue code that takes in `core.getStartServices`, extracts the dependencies
 * needed for this function, and wraps them behind a `getStartDependencies` function that
 * is then called at runtime.
 *
 * We do this so that we can be explicit about exactly which dependencies the function
 * requires, without cluttering up the top-level `plugin.ts` with this logic. It also
 * makes testing the expression function a bit easier since `getStartDependencies` is
 * the only thing you should need to mock.
 *
 * @param getStartServices - core's StartServicesAccessor for this plugin
 * @internal
 */
export function getEssql({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<DataStartDependencies, DataPublicPluginStart>;
}) {
  return getEssqlFn({
    async getStartDependencies() {
      const [
        { uiSettings },
        ,
        {
          nowProvider,
          search: { search },
        },
      ] = await getStartServices();

      return { nowProvider, search, uiSettings: uiSettings as unknown as UiSettingsCommon };
    },
  });
}
