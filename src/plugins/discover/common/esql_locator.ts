/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DISCOVER_ESQL_LOCATOR } from '@kbn/deeplinks-analytics';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { getIndexForESQLQuery, getInitialESQLQuery, getESQLAdHocDataview } from '@kbn/esql-utils';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';

export type DiscoverESQLLocatorParams = SerializableRecord;

export interface DiscoverESQLLocatorDependencies {
  discoverAppLocator: LocatorPublic<SerializableRecord>;
  dataViews: DataViewsPublicPluginStart;
}

export type DiscoverESQLLocator = LocatorPublic<DiscoverESQLLocatorParams>;

export class DiscoverESQLLocatorDefinition implements LocatorDefinition<DiscoverESQLLocatorParams> {
  public readonly id = DISCOVER_ESQL_LOCATOR;

  constructor(protected readonly deps: DiscoverESQLLocatorDependencies) {}

  public readonly getLocation = async () => {
    const { discoverAppLocator, dataViews } = this.deps;
    const indexName = (await getIndexForESQLQuery({ dataViews })) ?? '*';
    const dataView = await getESQLAdHocDataview(`from ${indexName}`, dataViews);
    const esql = getInitialESQLQuery(dataView);

    const params = {
      query: { esql },
    };

    return await discoverAppLocator.getLocation(params);
  };
}
