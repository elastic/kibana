/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { RequestDetailsProps } from '../../types';
import { getLocalClusterDetails } from './utils';
import { ClustersHealth } from './clusters_health';
import { ClustersTable } from './clusters_table';
import { LOCAL_CLUSTER_KEY } from './constants';

export class Clusters extends Component<RequestDetailsProps> {
  static shouldShow = (request: Request) =>
    Boolean(
      request.response?.json?.rawResponse?._shards || request.response?.json?.rawResponse?._clusters
    );

  render() {
    const rawResponse = this.props.request.response?.json?.rawResponse;
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
        <ClustersHealth clusters={clusters} />
        <ClustersTable clusters={clusters} />
      </>
    ) : null;
  }
}
