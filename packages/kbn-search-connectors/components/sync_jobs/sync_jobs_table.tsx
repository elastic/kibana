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
  EuiButtonIcon,
  EuiCode,
  EuiIcon,
  EuiToolTip,
  Pagination,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ConnectorSyncJob, isSyncCancellable, SyncJobType, SyncStatus } from '../..';

import { syncJobTypeToText, syncStatusToColor, syncStatusToText } from '../..';
import { durationToText, getSyncJobDuration } from '../../utils/duration_to_text';
import { FormattedDateTime } from '../../utils/formatted_date_time';
import { SyncJobFlyout } from './sync_job_flyout';
import { CancelSyncJobModal, CancelSyncModalProps } from './sync_job_cancel_modal';

interface SyncJobHistoryTableProps {
  isLoading?: boolean;
  onPaginate: (criteria: CriteriaWithPagination<ConnectorSyncJob>) => void;
  pagination: Pagination;
  syncJobs: ConnectorSyncJob[];
  type: 'content' | 'access_control';
  cancelConfirmModalProps?: Pick<CancelSyncModalProps, 'isLoading' | 'onConfirmCb'> & {
    syncJobIdToCancel?: ConnectorSyncJob['id'];
    setSyncJobIdToCancel: (syncJobId: ConnectorSyncJob['id'] | undefined) => void;
  };
}

export const SyncJobsTable: React.FC<SyncJobHistoryTableProps> = ({
  isLoading,
  onPaginate,
  pagination,
  syncJobs,
  type,
  cancelConfirmModalProps = {
    onConfirmCb: () => {},
    isLoading: false,
    setSyncJobIdToCancel: () => {},
    syncJobIdToCancel: undefined,
  },
}) => {
  const [selectedSyncJob, setSelectedSyncJob] = useState<ConnectorSyncJob | undefined>(undefined);
  const columns: Array<EuiBasicTableColumn<ConnectorSyncJob>> = [
    {
      field: 'completed_at',
      name: (
        <EuiToolTip
          content={
            <FormattedMessage
              id="searchConnectors.syncJobs.lastSync.columnTitle.tooltip"
              defaultMessage="The timestamp of a given job's {completed_at}. This is when syncs finish, either successfully, in error, or by being canceled."
              values={{ completed_at: <EuiCode>completed_at</EuiCode> }}
            />
          }
        >
          <>
            {i18n.translate('searchConnectors.syncJobs.lastSync.columnTitle', {
              defaultMessage: 'Last sync',
            })}
            <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
      render: (lastSync: string) =>
        lastSync ? <FormattedDateTime date={new Date(lastSync)} /> : '--',
      sortable: true,
      truncateText: false,
    },
    {
      name: (
        <EuiToolTip
          content={
            <FormattedMessage
              id="searchConnectors.syncJobs.syncDuration.columnTitle.tooltip"
              defaultMessage="The time between when a sync started ({started_at}) and when it terminated ({completed_at}) (whether successfully, in error, or canceled). Note that this does not include the time the job may have spent in a “pending” stage, waiting for a worker to pick it up."
              values={{
                completed_at: <EuiCode>completed_at</EuiCode>,
                started_at: <EuiCode>started_at</EuiCode>,
              }}
            />
          }
        >
          <>
            {i18n.translate('searchConnectors.syncJobs.syncDuration.columnTitle', {
              defaultMessage: 'Sync duration',
            })}
            <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
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
        ...(cancelConfirmModalProps
          ? [
              {
                render: (job: ConnectorSyncJob) => {
                  return isSyncCancellable(job.status) ? (
                    <EuiButtonIcon
                      iconType="cross"
                      color="danger"
                      onClick={() => cancelConfirmModalProps.setSyncJobIdToCancel(job.id)}
                      aria-label={i18n.translate(
                        'searchConnectors.index.syncJobs.actions.cancelSyncJob.caption',
                        {
                          defaultMessage: 'Cancel this sync job',
                        }
                      )}
                    >
                      {i18n.translate('searchConnectors.index.syncJobs.actions.deleteJob.caption', {
                        defaultMessage: 'Delete',
                      })}
                    </EuiButtonIcon>
                  ) : (
                    <></>
                  );
                },
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      {Boolean(selectedSyncJob) && (
        <SyncJobFlyout onClose={() => setSelectedSyncJob(undefined)} syncJob={selectedSyncJob} />
      )}
      {Boolean(cancelConfirmModalProps) && cancelConfirmModalProps?.syncJobIdToCancel && (
        <CancelSyncJobModal
          {...cancelConfirmModalProps}
          syncJobId={cancelConfirmModalProps.syncJobIdToCancel}
          onCancel={() => cancelConfirmModalProps.setSyncJobIdToCancel(undefined)}
        />
      )}
      <EuiBasicTable
        data-test-subj={`entSearchContent-index-${type}-syncJobs-table`}
        items={syncJobs}
        columns={columns}
        hasActions
        onChange={onPaginate}
        pagination={pagination}
        tableLayout="fixed"
        loading={isLoading}
      />
    </>
  );
};
