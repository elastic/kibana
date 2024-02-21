/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { SourcesPanelForStartChat } from './sources_panel/sources_panel_for_start_chat';

const maxWidthPage = 640;

export const StartNewChat: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexGroup
        css={{ padding: euiTheme.size.xxl, maxWidth: maxWidthPage }}
        direction="column"
        gutterSize="xl"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
            <EuiTitle>
              <h2>
                <FormattedMessage
                  id="aiPlayground.startNewChat.title"
                  defaultMessage="Start a new chat"
                />
              </h2>
            </EuiTitle>

            <EuiIcon type="discuss" size="xl" />
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <SourcesPanelForStartChat />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
