/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { AddIndicesField } from './add_indices_field';
import { IndicesTable } from './indices_table';
import { StartChatPanel } from '../start_chat_panel';
import { i18n } from '@kbn/i18n';
import { useSourceIndicesField } from '../../hooks/useSourceIndicesField';

export const SourcesPanelForStartChat: React.FC = () => {
  const { selectedIndices, removeIndex, addIndex } = useSourceIndicesField();

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

      <EuiFlexItem>
        <AddIndicesField selectedIndices={selectedIndices} onIndexSelect={addIndex} />
      </EuiFlexItem>
    </StartChatPanel>
  );
};
