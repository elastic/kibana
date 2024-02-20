/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface IndicesTableProps {
  onRemoveClick: (index: string) => void;
  indices: string[];
}

export const IndicesTable: React.FC<IndicesTableProps> = ({ onRemoveClick, indices }) => {
  return (
    <EuiBasicTable
      columns={[
        {
          field: 'name',
          name: i18n.translate('aiPlayground.sources.indicesTable.name', {
            defaultMessage: 'Name',
          }),
        },
        {
          name: 'Actions',
          actions: [
            {
              name: 'remove',
              description: i18n.translate(
                'aiPlayground.sources.indicesTable.removeActionDescriptions',
                {
                  defaultMessage: 'Remove index from source',
                }
              ),
              type: 'icon',
              icon: 'cross',
              onClick: (index) => onRemoveClick(index.id),
            },
          ],
        },
      ]}
      items={indices.map((name) => ({ id: name, name }))}
    />
  );
};
