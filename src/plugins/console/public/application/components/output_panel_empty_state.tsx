/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FunctionComponent } from 'react';
import { EuiEmptyPrompt, EuiTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useServicesContext } from '../contexts';

export const OutputPanelEmptyState: FunctionComponent = () => {
  const { docLinks } = useServicesContext();

  return (
    <EuiEmptyPrompt
      title={
        <h2>
          <FormattedMessage
            id="console.outputEmptyState.title"
            defaultMessage="Enter a new request"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="console.outputEmptyState.description"
            defaultMessage="When you run a request in the input panel, you will see the output response here."
          />
        </p>
      }
      footer={
        <>
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="console.outputEmptyState.learnMore"
                defaultMessage="Want to learn more?"
              />
            </h3>
          </EuiTitle>
          <EuiLink href={docLinks.console.guide} target="_blank">
            <FormattedMessage
              id="console.outputEmptyState.docsLink"
              defaultMessage="Read the Console docs"
            />
          </EuiLink>
        </>
      }
      data-test-subj="consoleOutputPanelEmptyState"
    />
  );
};
