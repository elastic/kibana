/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart, HttpSetup } from 'kibana/public';
import {
  MatchedItem,
  ResolveIndexResponseItemAlias,
} from 'src/plugins/data_view_editor/public/types';
import { getIndices } from '../../../data_view_editor/public/lib';

const FLEET_ASSETS_TO_IGNORE = {
  LOGS_INDEX_PATTERN: 'logs-*',
  METRICS_INDEX_PATTERN: 'metrics-*',
  LOGS_DATA_STREAM_TO_IGNORE: 'logs-elastic_agent', // ignore ds created by Fleet server itself
  METRICS_DATA_STREAM_TO_IGNORE: 'metrics-elastic_agent', // ignore ds created by Fleet server itself
  METRICS_ENDPOINT_INDEX_TO_IGNORE: 'metrics-endpoint.metadata_current_default', // ignore index created by Fleet endpoint package installed by default in Cloud
};

export class HasData {
  private removeAliases = (item: MatchedItem) =>
    !(item as unknown as ResolveIndexResponseItemAlias).indices;

  private isUserDataIndex = (source: MatchedItem) => {
    // filter out indices that start with `.`
    if (source.name.startsWith('.')) return false;

    // filter out sources from FLEET_ASSETS_TO_IGNORE
    if (source.name === FLEET_ASSETS_TO_IGNORE.LOGS_DATA_STREAM_TO_IGNORE) return false;
    if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_DATA_STREAM_TO_IGNORE) return false;
    if (source.name === FLEET_ASSETS_TO_IGNORE.METRICS_ENDPOINT_INDEX_TO_IGNORE) return false;

    // filter out empty sources created by apm server
    if (source.name.startsWith('apm-')) return false;

    return true;
  };

  start(core: CoreStart) {
    const { http } = core;
    return {
      /**
       * Check to see if ES data exists
       */
      hasESData: async () => {
        const hasLocalESData = await this.checkLocalESData(http);
        if (!hasLocalESData) {
          const hasRemoteESData = await this.checkRemoteESData(http);
          return hasRemoteESData;
        }
        return hasLocalESData;
      },
      /**
       * Check to see if user created data views exist
       */
      hasUserDataView: async () => {
        const hasLocalESData = await this.findUserDataViews();
        return hasLocalESData;
      },
      /**
       * Check to see if any data view exists
       */
      hasDataView: async () => {
        const hasLocalESData = await this.findDataViews();
        return hasLocalESData;
      },
    };
  }

  private checkLocalESData = (http: HttpSetup) => {
    return getIndices({
      http,
      isRollupIndex: () => false,
      pattern: '*',
      showAllIndices: false,
      searchClient: data.search.search,
    }).then((dataSources) => {
      return dataSources.some(this.isUserDataIndex);
    });
  };

  private checkRemoteESData = (http: HttpSetup) => {
    return getIndices({
      http,
      isRollupIndex: () => false,
      pattern: '*:*',
      showAllIndices: false,
      searchClient: data.search.search,
    }).then((dataSources) => {
      return !!dataSources.filter(this.removeAliases).length;
    });
  };

  private findDataViews = () => {
    return Promise.resolve(true);
  };

  private findUserDataViews = () => {
    return Promise.resolve(true);
  };
}

export type HasDataStart = ReturnType<HasData['start']>;

// searchClient: data.search.search,
