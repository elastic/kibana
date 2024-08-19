/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FunctionComponent } from 'react';
import { EuiPageSection, EuiSpacer, EuiTitle, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useServicesContext } from '../contexts';

export const OutputPanelEmptyState: FunctionComponent = () => {
  const { docLinks } = useServicesContext();

  return (
    <div className="conApp__outputPanel__emptyState" data-test-subj="consoleOutputPanelEmptyState">
      <EuiPageSection
        alignment="center"
        grow={true}
        css={{
          justifyContent: 'end',
          textAlign: 'center',
        }}
        bottomBorder={'extended'}
      >
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="console.outputEmptyState.title"
              defaultMessage="Enter a new request"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <FormattedMessage
          id="console.outputEmptyState.description"
          defaultMessage="When you run a request in the input panel, you will see the output response here."
        />
      </EuiPageSection>
      <EuiPageSection
        alignment="center"
        grow={true}
        css={{
          justifyContent: 'start',
          textAlign: 'center',
        }}
      >
        <EuiTitle size="xxs">
          <span>
            <FormattedMessage
              id="console.outputEmptyState.learnMore"
              defaultMessage="Want to learn more?"
            />
          </span>
        </EuiTitle>
        &nbsp;
        <EuiLink href={docLinks.console.guide} target="_blank" external>
          <FormattedMessage
            id="console.outputEmptyState.docsLink"
            defaultMessage="Read Console documentation"
          />
        </EuiLink>
      </EuiPageSection>
    </div>
  );
};
