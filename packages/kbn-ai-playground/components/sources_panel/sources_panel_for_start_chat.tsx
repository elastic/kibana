/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useController } from 'react-hook-form';
import { AddIndicesField } from './add_indices_field';
import { IndicesTable } from './indices_table';
import { StartChatPanel } from '../start_chat_panel';
import { CreateIndexCallout } from './create_index_callout';
import { useSourceIndicesField } from '../../hooks/useSourceIndicesField';
import { useQueryIndices } from '../../hooks/useQueryIndices';
import { ChatFormFields } from '../../types';
import { useIndicesFields } from '../../hooks/useIndicesFields';
import { createQuery, getDefaultQueryFields } from '../../lib/create_query';

export const SourcesPanelForStartChat: React.FC = () => {
  const { selectedIndices, removeIndex, addIndex } = useSourceIndicesField();
  const { indices, isLoading } = useQueryIndices();
  const { fields } = useIndicesFields(selectedIndices || []);

  const {
    field: { onChange: elasticsearchQueryOnChange },
  } = useController({
    name: ChatFormFields.elasticsearchQuery,
    defaultValue: {},
  });

  useEffect(() => {
    if (fields) {
      const defaultFields = getDefaultQueryFields(fields);
      elasticsearchQueryOnChange(createQuery(defaultFields, fields));
    }
  }, [selectedIndices, fields, elasticsearchQueryOnChange]);

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
