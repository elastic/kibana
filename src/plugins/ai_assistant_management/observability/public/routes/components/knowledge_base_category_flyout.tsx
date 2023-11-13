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
  EuiBasicTableColumn,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';
import { capitalize } from 'lodash';
import type { KnowledgeBaseEntry } from '@kbn/observability-ai-assistant-plugin/common/types';
import { useDeleteKnowledgeBaseEntry } from '../../hooks/use_delete_knowledge_base_entry';

export function KnowledgeBaseCategoryFlyout({
  category,
  entries,
  onClose,
}: {
  category: string;
  entries: KnowledgeBaseEntry[];
  onClose: () => void;
}) {
  const { mutate } = useDeleteKnowledgeBaseEntry();

  const columns: Array<EuiBasicTableColumn<KnowledgeBaseEntry>> = [
    {
      field: '@timestamp',
      name: 'Date created',
      sortable: true,
    },
    {
      field: 'id',
      name: 'ID',
      sortable: true,
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

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader>
        <EuiTitle>
          <h2>{capitalize(category)}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiBasicTable<KnowledgeBaseEntry> columns={columns} items={entries ?? []} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
