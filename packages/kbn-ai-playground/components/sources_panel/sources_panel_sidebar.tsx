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
  EuiAccordion,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { IndexName } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IndicesList } from './indices_list';
import { AddIndicesField } from './add_indices_field';

interface SourcesPanelSidebarProps {
  selectedIndices: IndexName[];
  addIndex: (newIndex: IndexName) => void;
  removeIndex: (index: IndexName) => void;
}

export const SourcesPanelSidebar: React.FC<SourcesPanelSidebarProps> = ({
  selectedIndices,
  addIndex,
  removeIndex,
}) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'sourceAccordion' });

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
    </EuiAccordion>
  );
};
