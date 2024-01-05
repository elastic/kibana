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

export type DiscoverEsqlLocatorParams = SerializableRecord;

export interface DiscoverEsqlLocatorDependencies {
  discoverAppLocator: LocatorPublic<SerializableRecord>;
}

export type DiscoverEsqlLocator = LocatorPublic<DiscoverEsqlLocatorParams>;

export class DiscoverEsqlLocatorDefinition implements LocatorDefinition<DiscoverEsqlLocatorParams> {
  public readonly id = DISCOVER_ESQL_LOCATOR;

  constructor(protected readonly deps: DiscoverEsqlLocatorDependencies) {}

  public readonly getLocation = async () => {
    const { discoverAppLocator } = this.deps;

    const params = {
      query: {
        esql: `SHOW FUNCTIONS`,
      },
    };

    const discoverLocation = await discoverAppLocator.getLocation(params);

    return discoverLocation;
  };
}
