/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ConnectorSyncJob } from '../../types';
import { SyncJobDocumentsPanel } from './documents_panel';
import { SyncJobEventsPanel } from './events_panel';
import { FilteringPanel } from './filtering_panel';
import { FlyoutPanel } from './flyout_panel';
import { PipelinePanel } from './pipeline_panel';
import { SyncJobCallouts } from './sync_callouts';

interface SyncJobFlyoutProps {
  onClose: () => void;
  syncJob?: ConnectorSyncJob;
}

export const SyncJobFlyout: React.FC<SyncJobFlyoutProps> = ({ onClose, syncJob }) => {
  const filtering = syncJob?.connector.filtering
    ? Array.isArray(syncJob?.connector.filtering)
      ? syncJob?.connector.filtering?.[0]
      : syncJob?.connector.filtering
    : null;
  const visible = !!syncJob;
  return visible ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('searchConnectors.syncJobs.flyout.title', {
              defaultMessage: 'Event log',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <SyncJobCallouts syncJob={syncJob} />
          <EuiFlexItem>
            <FlyoutPanel
              title={i18n.translate('searchConnectors.syncJobs.flyout.sync', {
                defaultMessage: 'Sync',
              })}
            >
              <EuiBasicTable
                columns={[
                  {
                    field: 'id',
                    name: i18n.translate('searchConnectors.syncJobs.flyout.sync.id', {
                      defaultMessage: 'ID',
                    }),
                  },
                ]}
                items={[{ id: syncJob.id }]}
              />
            </FlyoutPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <SyncJobDocumentsPanel
              added={syncJob.indexed_document_count}
              removed={syncJob.deleted_document_count}
              volume={syncJob.indexed_document_volume ?? 0}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SyncJobEventsPanel
              canceledAt={syncJob.canceled_at ?? ''}
              cancelationRequestedAt={syncJob.cancelation_requested_at ?? ''}
              syncRequestedAt={syncJob.created_at}
              syncStarted={syncJob.started_at ?? ''}
              completed={syncJob.completed_at ?? ''}
              lastUpdated={syncJob.last_seen ?? ''}
              triggerMethod={syncJob.trigger_method}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FilteringPanel
              advancedSnippet={filtering?.advanced_snippet}
              filteringRules={filtering?.rules ?? []}
            />
          </EuiFlexItem>
          {syncJob.connector?.pipeline && (
            <EuiFlexItem>
              <PipelinePanel pipeline={syncJob.connector.pipeline} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <></>
  );
};
