/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiPanel,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AddIndicesField } from './add_indices_field';
import { IndicesTable } from './indices_table';

export const SourcesPanelEmptyPrompt: React.FC = () => {
  const indices = ['search-index', 'search-books'];
  const [selectedIndices, setSelectedIndices] = React.useState<string[]>([]);
  const addIndex = (newIndex: string) => {
    setSelectedIndices([...selectedIndices, newIndex]);
  };
  const removeIndex = (index: string) => {
    setSelectedIndices(selectedIndices.filter((indexName) => indexName !== index));
  };

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiTitle size="xs">
        <h5>
          <FormattedMessage
            id="aiPlayground.emptyPrompts.sources.title"
            defaultMessage="Select sources"
          />
        </h5>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="aiPlayground.emptyPrompts.sources.description"
              defaultMessage="Where should the data for this chat experience be retrieved from?"
            />
          </p>
        </EuiText>

        {!!selectedIndices?.length && (
          <EuiFlexItem>
            <IndicesTable indices={selectedIndices} onRemoveClick={removeIndex} />
          </EuiFlexItem>
        )}

        <EuiFlexItem>
          <AddIndicesField
            selectedIndices={selectedIndices}
            indices={indices}
            onIndexSelect={addIndex}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
