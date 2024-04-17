/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiIcon, EuiToolTip, EuiCode } from '@elastic/eui';
import { ByteSizeValue } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';
import { FlyoutPanel } from './flyout_panel';

interface SyncJobDocumentsPanelProps {
  added: number;
  removed: number;
  volume: number;
}

export const SyncJobDocumentsPanel: React.FC<SyncJobDocumentsPanelProps> = (syncJobDocuments) => {
  const columns: Array<EuiBasicTableColumn<SyncJobDocumentsPanelProps>> = [
    {
      field: 'added',
      name: (
        <EuiToolTip
          content={
            <FormattedMessage
              id="searchConnectors.index.syncJobs.documents.upserted.tooltip"
              defaultMessage="The number of {index} operations the connector sent to the Elasticsearch _bulk API during this sync. This includes net-new documents and updates to existing documents. This does not account for duplicate _ids, or any documents dropped by an ingest processor"
              values={{ index: <EuiCode>index</EuiCode> }}
            />
          }
        >
          <>
            {i18n.translate('searchConnectors.index.syncJobs.documents.added', {
              defaultMessage: 'Upserted',
            })}
            <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
    },
    {
      field: 'removed',
      name: (
        <EuiToolTip
          content={
            <FormattedMessage
              id="searchConnectors.index.syncJobs.documents.deleted.tooltip"
              defaultMessage="The number of {delete} operations the connector sent to the Elasticsearch _bulk API at the conclusion of this sync. This may include documents dropped by Sync Rules. This does not include documents dropped by ingest processors. Documents are deleted from the index if the connector determines that they are no longer present in the data that should be fetched from the 3rd-party source."
              values={{ delete: <EuiCode>delete</EuiCode> }}
            />
          }
        >
          <>
            {i18n.translate('searchConnectors.index.syncJobs.documents.removed', {
              defaultMessage: 'Deleted',
            })}
            <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
    },
    {
      field: 'volume',
      name: (
        <EuiToolTip
          content={
            <FormattedMessage
              id="searchConnectors.index.syncJobs.documents.volume.tooltip"
              defaultMessage="The volume, in MB, of JSON data sent with {index} operations to the Elasticsearch _bulk API during this sync. The current Elasticsearch Index size may be larger, depending on index mappings and settings. It also may be smaller, if large data is substantially trimmed by ingest processors."
              values={{ index: <EuiCode>index</EuiCode> }}
            />
          }
        >
          <>
            {i18n.translate('searchConnectors.index.syncJobs.documents.volume', {
              defaultMessage: 'Volume',
            })}
            <EuiIcon size="s" type="questionInCircle" color="subdued" className="eui-alignTop" />
          </>
        </EuiToolTip>
      ),
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
