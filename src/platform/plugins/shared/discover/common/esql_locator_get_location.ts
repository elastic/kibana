/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { getESQLAdHocDataview, getIndexForESQLQuery, getInitialESQLQuery } from '@kbn/esql-utils';
import type { DiscoverESQLLocatorGetLocation } from './esql_locator';

export const esqlLocatorGetLocation = async ({
  discoverAppLocator,
  dataViews,
}: {
  discoverAppLocator: LocatorPublic<SerializableRecord>;
  dataViews: DataViewsPublicPluginStart;
}): ReturnType<DiscoverESQLLocatorGetLocation> => {
  const indexName = (await getIndexForESQLQuery({ dataViews })) ?? '*';
  const dataView = await getESQLAdHocDataview(`from ${indexName}`, dataViews);
  const esql = getInitialESQLQuery(dataView);

  const params = {
    query: { esql },
  };

  return await discoverAppLocator.getLocation(params);
};
