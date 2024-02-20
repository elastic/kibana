/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useController } from 'react-hook-form';
import { IndicesList } from './indices_list';
import { AddIndicesField } from './add_indices_field';
import { ChatFormFields } from '../../types';

export const SourcesPanelSidebar: React.FC = () => {
  const {
    field: { value: selectedIndices, onChange },
  } = useController({ name: ChatFormFields.indices, defaultValue: [] });
  const addIndex = (newIndex: IndexName) => {
    onChange([...selectedIndices, newIndex]);
  };
  const removeIndex = (index: IndexName) => {
    onChange(selectedIndices.filter((indexName: string) => indexName !== index));
  };

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiCallOut
          title={i18n.translate('aiPlayground.sources.callout', {
            defaultMessage: 'Changes here will reset your custom query',
          })}
          iconType="warning"
          size="s"
        />
      </EuiFlexItem>

      <EuiFlexItem>
        <IndicesList indices={selectedIndices} onRemoveClick={removeIndex} hasBorder />
      </EuiFlexItem>

      <EuiFlexItem>
        <AddIndicesField selectedIndices={selectedIndices} onIndexSelect={addIndex} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
