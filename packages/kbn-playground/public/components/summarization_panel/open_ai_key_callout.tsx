/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { EuiButton, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

interface OpenAIKeyCalloutProps {
  openAIFlyOutOpen: () => void;
}

export const OpenAIKeyCallout: React.FC<OpenAIKeyCalloutProps> = ({ openAIFlyOutOpen }) => {
  return (
    <EuiCallOut
      title={i18n.translate('playground.sidebar.openAICallout.headerText', {
        defaultMessage: 'Add OpenAI API Key',
      })}
      color="warning"
      iconType="warning"
    >
      <p>
        {i18n.translate('playground.sidebar.openAICallout.description', {
          defaultMessage:
            'The AI Playground uses OpenAl models for summarization. Add your OpenAI API key to continue.',
        })}
      </p>
      <EuiButton onClick={openAIFlyOutOpen} color="warning" fill data-test-subj="openaiflyout-open">
        {i18n.translate('playground.sidebar.openAICallout.buttonLabelText', {
          defaultMessage: 'Add OpenAI API Key',
        })}
      </EuiButton>
    </EuiCallOut>
  );
};
