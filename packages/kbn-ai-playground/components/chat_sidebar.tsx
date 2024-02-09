/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { EuiFormRow, EuiSwitch, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { InstructionsField } from './instructions_field';
import { OpenAIKeyCallout } from './open_ai_key_callout';
import { OpenAIKeyFlyOut } from './open_ai_key_flyout';
import { isEmpty } from 'lodash';

export const ChatSidebar: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isIncludeCitations, setIncludeCitations] = useState<boolean>(true);
  const [isOpenAIFlyOutOpen, setIsOpenAIFlyOutOpen] = React.useState<boolean>(false);
  const [openAIKey, setOpenAIKey] = useState<string>('');

  const onCloseOpenAIFlyOut = () => {
    setIsOpenAIFlyOutOpen(!isOpenAIFlyOutOpen);
  };

  return (
    <>
      {isOpenAIFlyOutOpen ? (
        <OpenAIKeyFlyOut onClose={onCloseOpenAIFlyOut} setOpenAIKey={setOpenAIKey} />
      ) : (
        <>
          {!isEmpty(openAIKey) ? (
            <EuiText>Summarization model goes here</EuiText>
          ) : (
            <OpenAIKeyCallout setIsOpenAIFlyOutOpen={setIsOpenAIFlyOutOpen} />
          )}
          <InstructionsField
            label={i18n.translate('aiPlayground.sidebar.instructionsField.label', {
              defaultMessage: 'Instructions',
            })}
            placeholder={i18n.translate('aiPlayground.sidebar.instructionsField.placeholder', {
              defaultMessage: 'Replace me',
            })}
            helpText={i18n.translate('aiPlayground.sidebar.instructionsField.help', {
              defaultMessage:
                'This is the instruction or question you want the AI to respond to. Be clear and specific for the best results.',
            })}
            value={prompt}
            onChange={setPrompt}
          />

          <EuiFormRow>
            <EuiSwitch
              label={i18n.translate('aiPlayground.sidebar.citationsField.label', {
                defaultMessage: 'Include citations',
              })}
              checked={isIncludeCitations}
              onChange={(e) => setIncludeCitations(e.target.checked)}
            />
          </EuiFormRow>
        </>
      )}  
    </>
  );
};
