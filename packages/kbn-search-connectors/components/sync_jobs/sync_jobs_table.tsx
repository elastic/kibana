/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  CriteriaWithPagination,
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  Pagination,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { ConnectorSyncJob, SyncJobType, SyncStatus } from '../..';

import { syncJobTypeToText, syncStatusToColor, syncStatusToText } from '../..';
import { durationToText, getSyncJobDuration } from '../../utils/duration_to_text';
import { FormattedDateTime } from '../../utils/formatted_date_time';
import { SyncJobFlyout } from './sync_job_flyout';

interface SyncJobHistoryTableProps {
  isLoading?: boolean;
  onPaginate: (criteria: CriteriaWithPagination<ConnectorSyncJob>) => void;
  pagination: Pagination;
  syncJobs: ConnectorSyncJob[];
  type: 'content' | 'access_control';
}

export const SyncJobsTable: React.FC<SyncJobHistoryTableProps> = ({
  isLoading,
  onPaginate,
  pagination,
  syncJobs,
  type,
}) => {
  const [selectedSyncJob, setSelectedSyncJob] = useState<ConnectorSyncJob | undefined>(undefined);
  const columns: Array<EuiBasicTableColumn<ConnectorSyncJob>> = [
    {
      field: 'completed_at',
      name: i18n.translate('searchConnectors.syncJobs.lastSync.columnTitle', {
        defaultMessage: 'Last sync',
      }),
      render: (lastSync: string) =>
        lastSync ? <FormattedDateTime date={new Date(lastSync)} /> : '--',
      sortable: true,
      truncateText: false,
    },
    {
      name: i18n.translate('searchConnectors.syncJobs.syncDuration.columnTitle', {
        defaultMessage: 'Sync duration',
      }),
      render: (syncJob: ConnectorSyncJob) => durationToText(getSyncJobDuration(syncJob)),
      truncateText: false,
    },
    ...(type === 'content'
      ? [
          {
            field: 'indexed_document_count',
            name: i18n.translate('searchConnectors.searchIndices.addedDocs.columnTitle', {
              defaultMessage: 'Docs upserted',
            }),
            sortable: true,
            truncateText: true,
          },
          {
            field: 'deleted_document_count',
            name: i18n.translate('searchConnectors.searchIndices.deletedDocs.columnTitle', {
              defaultMessage: 'Docs deleted',
            }),
            sortable: true,
            truncateText: true,
          },
          {
            field: 'job_type',
            name: i18n.translate('searchConnectors.searchIndices.syncJobType.columnTitle', {
              defaultMessage: 'Content sync type',
            }),
            render: (syncType: SyncJobType) => {
              const syncJobTypeText = syncJobTypeToText(syncType);
              if (syncJobTypeText.length === 0) return null;
              return <EuiBadge color="hollow">{syncJobTypeText}</EuiBadge>;
            },
            sortable: true,
            truncateText: true,
          },
        ]
      : []),
    ...(type === 'access_control'
      ? [
          {
            field: 'indexed_document_count',
            name: i18n.translate('searchConnectors.searchIndices.identitySync.columnTitle', {
              defaultMessage: 'Identities synced',
            }),
            sortable: true,
            truncateText: true,
          },
        ]
      : []),
    {
      field: 'status',
      name: i18n.translate('searchConnectors.searchIndices.syncStatus.columnTitle', {
        defaultMessage: 'Status',
      }),
      render: (syncStatus: SyncStatus) => (
        <EuiBadge color={syncStatusToColor(syncStatus)}>{syncStatusToText(syncStatus)}</EuiBadge>
      ),
      truncateText: true,
    },
    {
      actions: [
        {
          description: i18n.translate('searchConnectors.index.syncJobs.actions.viewJob.title', {
            defaultMessage: 'View this sync job',
          }),
          icon: 'eye',
          isPrimary: false,
          name: i18n.translate('searchConnectors.index.syncJobs.actions.viewJob.caption', {
            defaultMessage: 'View this sync job',
          }),
          onClick: (job) => setSelectedSyncJob(job),
          type: 'icon',
        },
      ],
    },
  ];

  return (
    <>
      {Boolean(selectedSyncJob) && (
        <SyncJobFlyout onClose={() => setSelectedSyncJob(undefined)} syncJob={selectedSyncJob} />
      )}
      <EuiBasicTable
        data-test-subj={`entSearchContent-index-${type}-syncJobs-table`}
        items={syncJobs}
        columns={columns}
        onChange={onPaginate}
        pagination={pagination}
        tableLayout="fixed"
        loading={isLoading}
      />
    </>
  );
};
