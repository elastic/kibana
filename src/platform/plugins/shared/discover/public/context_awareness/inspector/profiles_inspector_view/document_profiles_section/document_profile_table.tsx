/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiInMemoryTable, useEuiTheme } from '@elastic/eui';
import { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataTableRecordWithContext } from '../../../profiles_manager';
import { DocumentJsonDisplay } from './document_json_display';
import { getExpandAction } from './get_expand_action';

export const DocumentProfileTable = ({
  profileId,
  records,
  onViewRecordDetails,
}: {
  profileId: string;
  records: DataTableRecordWithContext[];
  onViewRecordDetails: (record: DataTableRecordWithContext) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [expandedRecord, setExpandedRecord] = useState<DataTableRecordWithContext | undefined>(
    undefined
  );

  return (
    <EuiInMemoryTable
      tableCaption={i18n.translate(
        'discover.inspector.profilesInspectorView.documentProfileTableCaption',
        {
          defaultMessage: 'Records with document profile ID {profileId}',
          values: { profileId },
        }
      )}
      items={records}
      itemId="id"
      pagination
      columns={[
        {
          name: i18n.translate('discover.inspector.profilesInspectorView.documentProfileIdColumn', {
            defaultMessage: 'Record ID',
          }),
          render: (record: DataTableRecordWithContext) => record.raw._id ?? record.id,
        },
        {
          field: 'context.type',
          name: i18n.translate(
            'discover.inspector.profilesInspectorView.documentProfileTypeColumn',
            {
              defaultMessage: 'Type',
            }
          ),
        },
        {
          name: i18n.translate(
            'discover.inspector.profilesInspectorView.documentProfileActionsColumn',
            {
              defaultMessage: 'Actions',
            }
          ),
          actions: [
            {
              name: i18n.translate(
                'discover.inspector.profilesInspectorView.documentProfileDetailsAction',
                {
                  defaultMessage: 'View details',
                }
              ),
              description: i18n.translate(
                'discover.inspector.profilesInspectorView.documentProfileDetailsActionDescription',
                {
                  defaultMessage: 'View record details',
                }
              ),
              'data-test-subj': 'documentProfileTableInspectAction',
              icon: 'inspect',
              type: 'icon',
              onClick: (record) => {
                onViewRecordDetails(record);
              },
            },
            getExpandAction<DataTableRecordWithContext>({
              name: i18n.translate('discover.inspector.profilesInspectorView.viewDocumentDetails', {
                defaultMessage: 'View record details',
              }),
              description: i18n.translate(
                'discover.inspector.profilesInspectorView.viewDocumentDetailsDescription',
                {
                  defaultMessage: 'Expand to view the document JSON',
                }
              ),
              'data-test-subj': 'documentProfileTableExpandAction',
              isExpanded: (value) => expandedRecord?.id === value.id,
              onClick: (value) => setExpandedRecord(value),
            }),
          ],
        },
      ]}
      itemIdToExpandedRowMap={
        expandedRecord
          ? { [expandedRecord.id]: <DocumentJsonDisplay record={expandedRecord} /> }
          : undefined
      }
      css={{
        table: {
          border: euiTheme.border.thin,
        },
      }}
    />
  );
};
