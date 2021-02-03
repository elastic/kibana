/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ScopedHistory } from 'kibana/public';

import { reactRouterNavigate } from '../../../../../../../kibana_react/public';

interface HeaderProps extends RouteComponentProps {
  indexPatternId: string;
  history: ScopedHistory;
}

export const Header = withRouter(({ indexPatternId, history }: HeaderProps) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem>
      <EuiTitle size="s">
        <h3>
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.scriptedHeader"
            defaultMessage="Scripted fields"
          />
        </h3>
      </EuiTitle>
      <EuiText>
        <p>
          <FormattedMessage
            id="indexPatternManagement.editIndexPattern.scriptedLabel"
            defaultMessage="You can use scripted fields in visualizations and display them in your documents. However, you cannot search
            scripted fields."
          />
        </p>
      </EuiText>
    </EuiFlexItem>

    <EuiFlexItem grow={false}>
      <EuiButton
        data-test-subj="addScriptedFieldLink"
        {...reactRouterNavigate(history, `patterns/${indexPatternId}/create-field/`)}
      >
        <FormattedMessage
          id="indexPatternManagement.editIndexPattern.scripted.addFieldButton"
          defaultMessage="Add scripted field"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
));
