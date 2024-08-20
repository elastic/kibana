/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiHorizontalRule,
  EuiSpacer,
  EuiTitle,
  EuiLink,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useServicesContext } from '../contexts';

export const OutputPanelEmptyState: FunctionComponent = () => {
  const { docLinks } = useServicesContext();

  return (
    <EuiFlexGroup
      alignItems="center"
      className="conApp__outputPanel__emptyState"
      data-test-subj="consoleOutputPanelEmptyState"
    >
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="console.outputEmptyState.title"
              defaultMessage="Enter a new request"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="relative">
          <p>
            <FormattedMessage
              id="console.outputEmptyState.description"
              defaultMessage="When you run a request in the input panel, you will see the output response here."
            />
          </p>
        </EuiText>

        <EuiHorizontalRule />

        <EuiText size="xs">
          <p>
            <strong>
              <FormattedMessage
                id="console.outputEmptyState.learnMore"
                defaultMessage="Want to learn more?"
              />
            </strong>
            &nbsp;
            <EuiLink href={docLinks.console.guide} target="_blank">
              <FormattedMessage
                id="console.outputEmptyState.docsLink"
                defaultMessage="Read Console documentation"
              />
            </EuiLink>
          </p>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
