/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useChatContext } from '../../hooks/useChatContext';

export const CreateIndexCallout: React.FC = () => {
  const { navigateToIndexPage } = useChatContext();

  return (
    <EuiCallOut
      title={i18n.translate('aiPlayground.sources.createIndexCallout.headerText', {
        defaultMessage: 'Create an index',
      })}
      color="primary"
      iconType="iInCircle"
    >
      <EuiText size="s">
        <p>
          <FormattedMessage
            id="aiPlayground.sources.createIndexCallout.description"
            defaultMessage="You can not continue without having at least one index with data to search."
          />
        </p>
      </EuiText>
      <EuiSpacer size="l" />
      <EuiButton
        color="primary"
        iconType="plusInCircle"
        fill
        size="s"
        onClick={navigateToIndexPage}
      >
        <FormattedMessage
          id="aiPlayground.sources.createIndexCallout."
          defaultMessage="Create an index"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
