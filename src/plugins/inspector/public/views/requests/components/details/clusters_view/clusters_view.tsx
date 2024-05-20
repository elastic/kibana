/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { EuiSearchBar, type EuiSearchBarOnChangeArgs, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Request } from '../../../../../../common/adapters/request/types';
import type { DetailViewProps } from '../types';
import { ClusterHealth, ClustersHealth } from './clusters_health';
import { ClustersTable } from './clusters_table';
import { findClusters } from './find_clusters';

interface State {
  clusters: Record<string, estypes.ClusterDetails>;
  showSearchAndStatusBar: boolean;
}

export class ClustersView extends Component<DetailViewProps, State> {
  static shouldShow = (request: Request) =>
    Boolean(
      (request.response?.json as { rawResponse?: estypes.SearchResponse })?.rawResponse?._shards ||
        (request.response?.json as { rawResponse?: estypes.SearchResponse })?.rawResponse?._clusters
    );

  constructor(props: DetailViewProps) {
    super(props);
    const clusters = findClusters(this.props.request);
    this.state = {
      clusters,
      showSearchAndStatusBar: Object.keys(clusters).length > 1,
    };
  }

  _onSearchChange = ({ query, error }: EuiSearchBarOnChangeArgs) => {
    if (!error) {
      this.setState({ clusters: findClusters(this.props.request, query) });
    }
  };

  render() {
    return (
      <>
        <EuiSpacer size="m" />
        {this.state.showSearchAndStatusBar ? (
          <>
            <EuiSearchBar
              box={{
                placeholder: 'Search by cluster name',
                incremental: true,
              }}
              filters={[
                {
                  type: 'field_value_selection',
                  field: 'status',
                  name: i18n.translate('inspector.requests.clusters.view.statusFilterLabel', {
                    defaultMessage: 'Status',
                  }),
                  multiSelect: 'or',
                  options: [
                    {
                      value: 'successful',
                      view: (
                        <ClusterHealth
                          status="successful"
                          textProps={{ size: 'm', color: 'text' }}
                        />
                      ),
                    },
                    {
                      value: 'partial',
                      view: (
                        <ClusterHealth status="partial" textProps={{ size: 'm', color: 'text' }} />
                      ),
                    },
                    {
                      value: 'skipped',
                      view: (
                        <ClusterHealth status="skipped" textProps={{ size: 'm', color: 'text' }} />
                      ),
                    },
                    {
                      value: 'failed',
                      view: (
                        <ClusterHealth status="failed" textProps={{ size: 'm', color: 'text' }} />
                      ),
                    },
                  ],
                },
              ]}
              onChange={this._onSearchChange}
            />
            <EuiSpacer size="m" />
            <ClustersHealth clusters={this.state.clusters} />
          </>
        ) : null}
        <ClustersTable clusters={this.state.clusters} />
      </>
    );
  }
}
