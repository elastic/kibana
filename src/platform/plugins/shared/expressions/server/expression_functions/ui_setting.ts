/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup } from '@kbn/core/server';
import { getUiSettingFnServer } from '../../common';

export function getUiSettingFn({ getStartServices }: Pick<CoreSetup, 'getStartServices'>) {
  return getUiSettingFnServer({
    async getStartDependencies(getKibanaRequest) {
      const [{ savedObjects, uiSettings }] = await getStartServices();
      const savedObjectsClient = savedObjects.getScopedClient(getKibanaRequest());
      const uiSettingsClient = uiSettings.asScopedToClient(savedObjectsClient);

      return { uiSettings: uiSettingsClient };
    },
  });
}
