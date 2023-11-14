/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import moment from 'moment';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';
import { KnowledgeBaseEntryCategory } from '../../helpers/categorize_entries';

export function KnowledgeBaseCategoryFlyout({
  category,
  onClose,
}: {
  category: KnowledgeBaseEntryCategory;
  onClose: () => void;
}) {
  const { mutate } = useDeleteKnowledgeBaseEntry();

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntry>> = [
    {
      field: '@timestamp',
      name: 'Date created',
      sortable: true,
      render: (timestamp: KnowledgeBaseEntry['@timestamp']) => (
        <EuiBadge color="hollow">{moment(timestamp).format('MM-DD-YYYY')}</EuiBadge>
      ),
    },
    {
      field: 'id',
      name: 'Name',
      sortable: true,
      width: '340px',
    },
    {
      name: 'Actions',
      actions: [
        {
          name: 'Delete',
          description: 'Delete this entry',
          type: 'icon',
          icon: 'trash',
          onClick: (entry) => {
            mutate({ id: entry.id });
          },
        },
      ],
    },
  ];

  return category.entries.length === 1 && category.entries[0].labels.type === 'manual' ? (
    <div>
      {i18n.translate(
        'aiAssistantManagementObservability.knowledgeBaseCategoryFlyout.div.helloLabel',
        { defaultMessage: 'hello' }
      )}
    </div>
  ) : (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>{capitalize(category.categoryName)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiBasicTable<KnowledgeBaseEntry> columns={columns} items={category.entries ?? []} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
