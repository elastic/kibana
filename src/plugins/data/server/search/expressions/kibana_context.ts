/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { StartServicesAccessor } from 'src/core/server';
import { getKibanaContextFn } from '../../../common/search/expressions';
import { DataPluginStart, DataPluginStartDependencies } from '../../plugin';
import { SavedObjectsClientCommon } from '../../../common/index_patterns';

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
 *
 * @internal
 */
export function getKibanaContext({
  getStartServices,
}: {
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>;
}) {
  return getKibanaContextFn(async (getKibanaRequest) => {
    if (!getKibanaRequest || !getKibanaRequest()) {
      throw new Error(
        i18n.translate('data.search.kibana_context.error.kibanaRequest', {
          defaultMessage:
            'A KibanaRequest is required to execute this search on the server. ' +
            'Please provide a request object to the expression execution params.',
        })
      );
    }

    const [{ savedObjects }] = await getStartServices();
    return {
      savedObjectsClient: (savedObjects.getScopedClient(
        getKibanaRequest()
      ) as any) as SavedObjectsClientCommon,
    };
  });
}
