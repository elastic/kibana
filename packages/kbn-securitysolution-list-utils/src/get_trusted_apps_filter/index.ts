/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { SavedObjectType } from '../types';

export const getTrustedAppsFilter = (
  showTrustedApps: boolean,
  namespaceTypes: SavedObjectType[]
): string => {
  if (showTrustedApps) {
    const filters = namespaceTypes.map((namespace) => {
      return `${namespace}.attributes.list_id: ${ENDPOINT_TRUSTED_APPS_LIST_ID}*`;
    });
    return `(${filters.join(' OR ')})`;
  } else {
    const filters = namespaceTypes.map((namespace) => {
      return `not ${namespace}.attributes.list_id: ${ENDPOINT_TRUSTED_APPS_LIST_ID}*`;
    });
    return `(${filters.join(' AND ')})`;
  }
};
