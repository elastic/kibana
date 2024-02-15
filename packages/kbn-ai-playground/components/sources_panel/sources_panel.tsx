/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { IndicesTable } from './indices_table';
import { AddIndicesField } from './add_indices_field';

interface SourcesFlyoutProps {}

export const SourcesPanel: React.FC<SourcesFlyoutProps> = () => {
  const accordionId = useGeneratedHtmlId({ prefix: 'sourceAccordion' });
  const [indices, setIndices] = React.useState<string[]>([]);
  const addIndices = (newIndices: string[]) => {
    setIndices([...indices, ...newIndices]);
  };
  const removeIndex = (index: string) => {
    setIndices(indices.filter((i: string) => i !== index));
  };

  return (
    <EuiAccordion
      id={accordionId}
      buttonContent={
        <EuiTitle>
          <h3>{i18n.translate('aiPlayground.sources.title', { defaultMessage: 'Sources' })}</h3>
        </EuiTitle>
      }
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <IndicesTable onRemoveClick={removeIndex} />
        </EuiFlexItem>

        <EuiFlexItem>
          <AddIndicesField addIndices={addIndices} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiAccordion>
  );
};
