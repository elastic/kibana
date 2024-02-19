/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiListGroup, EuiListGroupItem } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface IndicesListProps {
  indices: Array<{ id: string; name: string }>;
  onRemoveClick: (index: string) => void;
  hasBorder?: boolean;
}

export const IndicesList: React.FC<IndicesListProps> = ({ indices, onRemoveClick, hasBorder }) => (
  <EuiFormRow
    label={i18n.translate('aiPlayground.sources.indices.label', {
      defaultMessage: 'Selected indices',
    })}
  >
    <EuiListGroup bordered={hasBorder}>
      {indices.map((index) => (
        <EuiListGroupItem
          color="primary"
          label={index.name}
          size="s"
          extraAction={{
            alwaysShow: true,
            'aria-label': i18n.translate('aiPlayground.sources.indices.removeIndex', {
              defaultMessage: 'Remove index from sources',
            }),
            color: 'text',
            iconType: 'minusInCircle',
            onClick: () => onRemoveClick(index.id),
          }}
        />
      ))}
    </EuiListGroup>
  </EuiFormRow>
);
