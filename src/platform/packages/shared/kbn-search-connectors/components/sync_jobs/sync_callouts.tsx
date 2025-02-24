/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiFlexItem, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { durationToText, getSyncJobDuration } from '../../utils/duration_to_text';
import { FormattedDateTime } from '../../utils/formatted_date_time';
import { ConnectorSyncJob, SyncStatus, TriggerMethod } from '../..';

interface SyncJobCalloutsProps {
  syncJob: ConnectorSyncJob;
}

export const SyncJobCallouts: React.FC<SyncJobCalloutsProps> = ({ syncJob }) => {
  return (
    <>
      {!!syncJob.completed_at && (
        <EuiFlexItem>
          <EuiCallOut
            color="success"
            iconType="check"
            title={i18n.translate('searchConnectors.syncJobs.flyout.completedTitle', {
              defaultMessage: 'Sync complete',
            })}
          >
            <FormattedMessage
              id="searchConnectors.syncJobs.flyout.completedDescription"
              defaultMessage="Completed at {date}"
              values={{
                date: <FormattedDateTime date={new Date(syncJob.completed_at)} />,
              }}
            />
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.ERROR && (
        <EuiFlexItem>
          <EuiCallOut
            color="danger"
            iconType="cross"
            title={i18n.translate('searchConnectors.syncJobs.flyout.failureTitle', {
              defaultMessage: 'Sync failure',
            })}
          >
            {i18n.translate('searchConnectors.syncJobs.flyout.failureDescription', {
              defaultMessage: 'Sync failure: {error}.',
              values: {
                error: syncJob.error,
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.CANCELED && (
        <EuiFlexItem>
          <EuiCallOut
            color="danger"
            iconType="cross"
            title={i18n.translate('searchConnectors.syncJobs.flyout.canceledTitle', {
              defaultMessage: 'Sync canceled',
            })}
          >
            {!!syncJob.canceled_at && (
              <FormattedMessage
                id="searchConnectors.syncJobs.flyout.canceledDescription"
                defaultMessage="Sync canceled at {date}"
                values={{
                  date: <FormattedDateTime date={new Date(syncJob.canceled_at)} />,
                }}
              />
            )}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.IN_PROGRESS && (
        <EuiFlexItem>
          <EuiCallOut
            color="warning"
            iconType="clock"
            title={i18n.translate('searchConnectors.syncJobs.flyout.inProgressTitle', {
              defaultMessage: 'In progress',
            })}
          >
            {i18n.translate('searchConnectors.syncJobs.flyout.inProgressDescription', {
              defaultMessage: 'Sync has been running for {duration}.',
              values: {
                duration: durationToText(getSyncJobDuration(syncJob)),
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {!!syncJob.started_at && (
        <EuiFlexItem>
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={
              syncJob.trigger_method === TriggerMethod.ON_DEMAND
                ? i18n.translate('searchConnectors.syncJobs.flyout.syncStartedManually', {
                    defaultMessage: 'Sync started manually',
                  })
                : i18n.translate('searchConnectors.syncJobs.flyout.syncStartedScheduled', {
                    defaultMessage: 'Sync started by schedule',
                  })
            }
          >
            <FormattedMessage
              id="searchConnectors.syncJobs.flyout.startedAtDescription"
              defaultMessage="Started at {date}"
              values={{
                date: <FormattedDateTime date={new Date(syncJob.started_at)} />,
              }}
            />
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </>
  );
};
