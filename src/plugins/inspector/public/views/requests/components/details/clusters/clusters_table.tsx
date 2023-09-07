/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiHealth } from '@elastic/eui';

const COLUMNS = [
  {
    field: 'name',
    name: i18n.translate('inspector.requests.clustersTable.nameLabel', {
      defaultMessage: 'Name',
    }),
  },
  {
    field: 'status',
    name: i18n.translate('inspector.requests.clustersTable.statusLabel', {
      defaultMessage: 'Status',
    }),
    render: (status: estypes.ClusterSearchStatus) => {
      let color = 'subdued';
      let label = status;
      if (status === 'successful') {
        color = 'success';
        label = i18n.translate('inspector.requests.clustersTable.successfulLabel', {
          defaultMessage: 'Successful',
        });
      } else if (status === 'partial') {
        color = 'warning';
        label = i18n.translate('inspector.requests.clustersTable.partialLabel', {
          defaultMessage: 'Partial',
        });
      } else if (status === 'failed') {
        color = 'danger';
        label = i18n.translate('inspector.requests.clustersTable.failedLabel', {
          defaultMessage: 'Failed',
        });
      }

      return (
        <EuiHealth color={color}>{label}</EuiHealth>
      );
    },
  },
  {
    field: 'responseTime',
    name: i18n.translate('inspector.requests.clustersTable.responseTimeLabel', {
      defaultMessage: 'Response time',
    }),
    render: (responseTime: number | undefined) => (
      responseTime 
        ? i18n.translate('inspector.requests.clustersTable.responseTimeInMilliseconds', {
          defaultMessage: '{responseTime}ms',
          values: { responseTime }
        })
        : null
    ),
  }
];

interface Props {
  clusters: ClusterDetails;
}

export function ClustersTable({ clusters }: Props) {

  return (
    <EuiBasicTable
      items={Object.keys(clusters).map(key => {
        return {
          name: key,
          status: clusters[key].status,
          responseTime: clusters[key].took,
        };
      })}
      rowHeader="name"
      columns={COLUMNS}
    />
  );
}