/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { AddIndicesField } from './add_indices_field';
import { IndicesTable } from './indices_table';
import { StartChatPanel } from '../start_chat_panel';
import { useSourceIndicesField } from '../../hooks/useSourceIndicesField';
import { useQueryIndices } from '../../hooks/useQueryIndices';
import { i18n } from '@kbn/i18n';
import { CreateIndexCallout } from '@kbn/ai-playground/components/sources_panel/create_index_callout';

export const SourcesPanelForStartChat: React.FC = () => {
  const { selectedIndices, removeIndex, addIndex } = useSourceIndicesField();
  const { indices, isLoading } = useQueryIndices();

  return (
    <StartChatPanel
      title={i18n.translate('aiPlayground.emptyPrompts.sources.title', {
        defaultMessage: 'Select sources',
      })}
      description={i18n.translate('aiPlayground.emptyPrompts.sources.description', {
        defaultMessage: 'Where should the data for this chat experience be retrieved from?',
      })}
      isValid={!!selectedIndices.length}
    >
      {!!selectedIndices?.length && (
        <EuiFlexItem>
          <IndicesTable indices={selectedIndices} onRemoveClick={removeIndex} />
        </EuiFlexItem>
      )}

      {isLoading && (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiLoadingSpinner size="l" />
        </EuiFlexGroup>
      )}

      {!isLoading && !!indices?.length && (
        <EuiFlexItem>
          <AddIndicesField selectedIndices={selectedIndices} onIndexSelect={addIndex} />
        </EuiFlexItem>
      )}

      {!isLoading && !indices?.length && <CreateIndexCallout />}
    </StartChatPanel>
  );
};
