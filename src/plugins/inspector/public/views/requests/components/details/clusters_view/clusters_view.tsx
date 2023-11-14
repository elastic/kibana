/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { EuiSpacer } from '@elastic/eui';
import type { ClusterDetails } from '@kbn/es-types';
import { Request } from '../../../../../../common/adapters/request/types';
import type { DetailViewProps } from '../types';
import { getLocalClusterDetails, LOCAL_CLUSTER_KEY } from './local_cluster';
import { ClustersHealth } from './clusters_health';
import { ClustersTable } from './clusters_table';

export class ClustersView extends Component<DetailViewProps> {
  static shouldShow = (request: Request) =>
    Boolean(
      (request.response?.json as { rawResponse?: estypes.SearchResponse })?.rawResponse?._shards ||
        (request.response?.json as { rawResponse?: estypes.SearchResponse })?.rawResponse?._clusters
    );

  render() {
    const rawResponse = (
      this.props.request.response?.json as { rawResponse?: estypes.SearchResponse }
    )?.rawResponse;
    if (!rawResponse) {
      return null;
    }

    const clusters = rawResponse._clusters
      ? (
          rawResponse._clusters as estypes.ClusterStatistics & {
            details: Record<string, ClusterDetails>;
          }
        ).details
      : {
          [LOCAL_CLUSTER_KEY]: getLocalClusterDetails(rawResponse),
        };

    return this.props.request.response?.json ? (
      <>
        <EuiSpacer size="m" />
        {Object.keys(clusters).length > 1 ? <ClustersHealth clusters={clusters} /> : null}
        <ClustersTable clusters={clusters} />
      </>
    ) : null;
  }
}
