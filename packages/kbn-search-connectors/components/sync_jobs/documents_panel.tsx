/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn } from '@elastic/eui';
import { ByteSizeValue } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { FlyoutPanel } from './flyout_panel';

interface SyncJobDocumentsPanelProps {
  added: number;
  removed: number;
  total: number;
  volume: number;
}

export const SyncJobDocumentsPanel: React.FC<SyncJobDocumentsPanelProps> = (syncJobDocuments) => {
  const columns: Array<EuiBasicTableColumn<SyncJobDocumentsPanelProps>> = [
    {
      field: 'added',
      name: i18n.translate('searchConnectors.index.syncJobs.documents.added', {
        defaultMessage: 'Added',
      }),
    },
    {
      field: 'removed',
      name: i18n.translate('searchConnectors.index.syncJobs.documents.removed', {
        defaultMessage: 'Removed',
      }),
    },
    {
      field: 'total',
      name: i18n.translate('searchConnectors.index.syncJobs.documents.total', {
        defaultMessage: 'Total',
      }),
    },
    {
      field: 'volume',
      name: i18n.translate('searchConnectors.index.syncJobs.documents.volume', {
        defaultMessage: 'Volume',
      }),
      render: (volume: number) =>
        volume < 1
          ? i18n.translate('searchConnectors.index.syncJobs.documents.volume.lessThanOneMBLabel', {
              defaultMessage: 'Less than 1mb',
            })
          : i18n.translate('searchConnectors.index.syncJobs.documents.volume.aboutLabel', {
              defaultMessage: 'About {volume}',
              values: {
                volume: new ByteSizeValue(volume * 1024 * 1024).toString(),
              },
            }),
    },
  ];
  return (
    <FlyoutPanel
      title={i18n.translate('searchConnectors.index.syncJobs.documents.title', {
        defaultMessage: 'Documents',
      })}
    >
      <EuiBasicTable columns={columns} items={[syncJobDocuments]} />
    </FlyoutPanel>
  );
};
