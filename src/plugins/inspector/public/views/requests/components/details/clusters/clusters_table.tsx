/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, ReactNode } from 'react';
import { estypes } from '@elastic/elasticsearch';
import { i18n } from '@kbn/i18n';
import { EuiBasicTable, EuiButtonIcon } from '@elastic/eui';
import { ClusterDescriptionList } from './cluster_description_list';
import { ClusterHealth } from './cluster_health';

function getInitialExpandedRow(clusters) {
  const clusterNames = Object.keys(clusters);
  return clusterNames.length === 1
    ? { [clusterNames[0]]: <ClusterDescriptionList clusterDetails={clusters[clusterNames[0]]} /> }
    : {};
}

interface Props {
  clusters: Record<string, ClusterDetails>;
}

export function ClustersTable({ clusters }: Props) {
  const [expandedRows, setExpandedRows] = useState<Record<string, ReactNode>>(
    getInitialExpandedRow(clusters)
  );

  const toggleDetails = (name: string) => {
    const nextExpandedRows = { ...expandedRows };
    if (name in nextExpandedRows) {
      delete nextExpandedRows[name];
    } else {
      nextExpandedRows[name] = <ClusterDescriptionList clusterDetails={clusters[name]} />;
    }
    setExpandedRows(nextExpandedRows);
  };

  const columns = [
    {
      field: 'name',
      name: i18n.translate('inspector.requests.clustersTable.nameLabel', {
        defaultMessage: 'Name',
      }),
      render: (name: string) => {
        return (
          <>
            <EuiButtonIcon
              onClick={() => toggleDetails(name)}
              aria-label={
                name in expandedRows
                  ? i18n.translate('inspector.requests.clustersTable.collapseRow', {
                      defaultMessage: 'Collapse table row to hide cluster details',
                    })
                  : i18n.translate('inspector.requests.clustersTable.expandRow', {
                      defaultMessage: 'Expand table row to view cluster details',
                    })
              }
              iconType={name in expandedRows ? 'arrowDown' : 'arrowRight'}
            />
            {name}
          </>
        );
      },
    },
    {
      field: 'status',
      name: i18n.translate('inspector.requests.clustersTable.statusLabel', {
        defaultMessage: 'Status',
      }),
      render: (status: estypes.ClusterSearchStatus) => {
        return <ClusterHealth status={status} />;
      },
    },
    {
      field: 'responseTime',
      name: i18n.translate('inspector.requests.clustersTable.responseTimeLabel', {
        defaultMessage: 'Response time',
      }),
      render: (responseTime: number | undefined) =>
        responseTime
          ? i18n.translate('inspector.requests.clustersTable.responseTimeInMilliseconds', {
              defaultMessage: '{responseTime}ms',
              values: { responseTime },
            })
          : null,
    },
  ];

  return (
    <EuiBasicTable
      items={Object.keys(clusters).map((key) => {
        return {
          name: key,
          status: clusters[key].status,
          responseTime: clusters[key].took,
        };
      })}
      isExpandable={true}
      itemIdToExpandedRowMap={expandedRows}
      itemId="name"
      columns={columns}
    />
  );
}
