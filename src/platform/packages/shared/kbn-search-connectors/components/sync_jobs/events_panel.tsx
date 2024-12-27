/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import moment from 'moment';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { FormattedDateTime } from '../../utils/formatted_date_time';
import { TriggerMethod } from '../..';

import { FlyoutPanel } from './flyout_panel';

export interface SyncJobsEventPanelProps {
  cancelationRequestedAt?: string;
  canceledAt?: string;
  completed?: string;
  lastUpdated?: string;
  syncRequestedAt?: string;
  syncStarted?: string;
  triggerMethod: TriggerMethod;
}

interface SyncJobEvent {
  date?: string;
  title: string;
}

export const SyncJobEventsPanel: React.FC<SyncJobsEventPanelProps> = ({
  cancelationRequestedAt,
  canceledAt,
  completed,
  lastUpdated,
  syncRequestedAt,
  syncStarted,
  triggerMethod,
}) => {
  const events: SyncJobEvent[] = [
    {
      date: syncRequestedAt,
      title:
        triggerMethod === TriggerMethod.ON_DEMAND
          ? i18n.translate('searchConnectors.index.syncJobs.events.syncRequestedManually', {
              defaultMessage: 'Sync requested manually',
            })
          : i18n.translate('searchConnectors.index.syncJobs.events.syncRequestedScheduled', {
              defaultMessage: 'Sync requested by schedule',
            }),
    },
    {
      date: syncStarted,
      title: i18n.translate('searchConnectors.index.syncJobs.events.syncStarted', {
        defaultMessage: 'Sync started',
      }),
    },
    {
      date: lastUpdated,
      title: i18n.translate('searchConnectors.index.syncJobs.events.lastUpdated', {
        defaultMessage: 'Last updated',
      }),
    },
    {
      date: completed,
      title: i18n.translate('searchConnectors.index.syncJobs.events.completed', {
        defaultMessage: 'Completed',
      }),
    },
    {
      date: cancelationRequestedAt,
      title: i18n.translate('searchConnectors.index.syncJobs.events.cancelationRequested', {
        defaultMessage: 'Cancelation requested',
      }),
    },
    {
      date: canceledAt,
      title: i18n.translate('searchConnectors.index.syncJobs.events.canceled', {
        defaultMessage: 'Canceled',
      }),
    },
  ]
    .filter(({ date }) => !!date)
    .sort(({ date }, { date: dateB }) => (moment(date).isAfter(moment(dateB)) ? 1 : -1));

  const columns: Array<EuiBasicTableColumn<SyncJobEvent>> = [
    {
      field: 'title',
      name: i18n.translate('searchConnectors.index.syncJobs.events.state', {
        defaultMessage: 'State',
      }),
      width: '50%',
    },
    {
      field: 'date',
      name: i18n.translate('searchConnectors.index.syncJobs.events.time', {
        defaultMessage: 'Time',
      }),
      render: (date: string) => <FormattedDateTime date={new Date(date)} />,
      width: '50%',
    },
  ];
  return (
    <FlyoutPanel
      title={i18n.translate('searchConnectors.index.syncJobs.events.title', {
        defaultMessage: 'Events',
      })}
    >
      <EuiBasicTable columns={columns} items={events} />
    </FlyoutPanel>
  );
};
