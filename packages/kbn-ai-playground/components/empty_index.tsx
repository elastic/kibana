/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { SourcesPanelEmptyPrompt } from './sources_panel/sources_panel_empty_prompt';

interface EmptyIndexProps {
  onCreateIndexClick: () => void;
}

export const EmptyIndex: React.FC<EmptyIndexProps> = ({ onCreateIndexClick }) => {
  return (
    <EuiFlexGroup gutterSize="l" direction="column">
      <EuiFlexItem>
        <EuiPanel>
          <EuiEmptyPrompt
            title={
              <h2>
                {i18n.translate('aiPlayground.emptyIndex.h2.addData', {
                  defaultMessage: 'Add data',
                })}
              </h2>
            }
            iconType="plusInCircle"
            titleSize="m"
            color="subdued"
            body={
              <p>
                {i18n.translate('aiPlayground.emptyIndex.p.addDataAndIndexLabel', {
                  defaultMessage: 'To use the AI Playground, create an index and add some data.',
                })}
              </p>
            }
            actions={
              <EuiButton
                color="primary"
                disabled={false}
                fill
                iconType="plusInCircle"
                onClick={onCreateIndexClick}
              >
                {i18n.translate('aiPlayground.emptyIndex.newIndexButtonLabel', {
                  defaultMessage: 'Create an index',
                })}
              </EuiButton>
            }
          />
        </EuiPanel>
      </EuiFlexItem>

      <SourcesPanelEmptyPrompt />
    </EuiFlexGroup>
  );
};
