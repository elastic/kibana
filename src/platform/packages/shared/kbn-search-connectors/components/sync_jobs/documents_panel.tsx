/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { EuiBasicTable, EuiBasicTableColumn, EuiIcon, EuiToolTip, EuiCode } from '@elastic/eui';
import { ByteSizeValue } from '@kbn/config-schema/src/byte_size_value'; // importing from file to avoid leaking `joi` to the browser
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
              defaultMessage="Number of {index} operations the connector sent to the Elasticsearch _bulk API, including updates to existing documents. Note that the number of documents upserted and the number of documents in the index may differ."
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
              defaultMessage="Number of {delete} operations the connector sent to the Elasticsearch _bulk API. May include documents dropped by Sync Rules. Does not include documents dropped by ingest processors. Documents are deleted when the connector determines they are no longer present in the third-party source."
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
              defaultMessage="Volume (in MB) of JSON data sent with {index} operations to the Elasticsearch _bulk API. The Elasticsearch index may be larger, depending on index mappings and settings, or smaller, if data is trimmed by ingest processors."
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
