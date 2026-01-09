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
import type { HttpStart } from '@kbn/core/public';
import { getESQLAdHocDataview, getIndexForESQLQuery, getInitialESQLQuery } from '@kbn/esql-utils';
import type { DiscoverESQLLocatorGetLocation } from './esql_locator';

export const esqlLocatorGetLocation = async ({
  discoverAppLocator,
  dataViews,
  http,
}: {
  discoverAppLocator: LocatorPublic<SerializableRecord>;
  dataViews: DataViewsPublicPluginStart;
  http: HttpStart;
}): ReturnType<DiscoverESQLLocatorGetLocation> => {
  const indexName = (await getIndexForESQLQuery({ dataViews })) ?? '*';
  const dataView = await getESQLAdHocDataview({
    dataViewsService: dataViews,
    query: `FROM ${indexName}`,
    http,
  });
  const esql = getInitialESQLQuery(dataView, true);

  const params = {
    query: { esql },
  };

  return await discoverAppLocator.getLocation(params);
};
