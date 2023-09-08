/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import type { RequestDetailsProps } from '../../types';
import { getLocalClusterDetails } from './utils';
import { ClustersTable } from './clusters_table';

export class Clusters extends Component<RequestDetailsProps> {
  static shouldShow = (request: Request) => Boolean(request.response?.json);

  render() {
    console.log(this.props);
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
          local: getLocalClusterDetails(rawResponse),
        };
    console.log(clusters);

    return this.props.request.response?.json ? (
      <>
        <ClustersTable clusters={clusters} />
      </>
    ) : null;
  }
}
