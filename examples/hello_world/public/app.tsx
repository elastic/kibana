/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiPageTemplate,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

const DEFAULT_NAME = 'World';

export interface HelloAppProps {
  core: CoreStart;
}

export const HelloApp: React.FC<HelloAppProps> = ({ core }) => {
  const [name, setName] = useLocalStorage('helloWorldAppName', DEFAULT_NAME);

  const handleText: React.EventHandler<React.ChangeEvent<HTMLInputElement>> = (event) => {
    setName(event.target.value);
  };

  const handleReset = () => {
    setName(DEFAULT_NAME);
  };

  return (
    <KibanaRenderContextProvider analytics={core.analytics} theme={core.theme} i18n={core.i18n}>
      <EuiPageTemplate>
        <EuiPageTemplate.Section color="subdued" grow={false}>
          <EuiTitle size="l">
            <h1>Hello World!</h1>
          </EuiTitle>
          <EuiText>
            <FormattedMessage
              id="helloApp.title"
              defaultMessage="This is a demonstration to show an interactive user interface in Kibana."
            />
          </EuiText>
        </EuiPageTemplate.Section>

        <EuiPageTemplate.Section grow={false}>
          <EuiText>
            <p data-test-subj="helloWorldDiv">
              {i18n.translate('helloApp.showName', {
                defaultMessage: 'Hello {name}!',
                values: { name },
              })}
            </p>
          </EuiText>
        </EuiPageTemplate.Section>

        <EuiPageTemplate.Section grow={true} bottomBorder="extended">
          <EuiForm>
            <EuiFormRow
              label={i18n.translate('helloApp.promptName', {
                defaultMessage: 'What is your name?',
              })}
            >
              <EuiFieldText
                data-test-subj="helloWorldTextHandle"
                type="text"
                value={name}
                onChange={handleText}
              />
            </EuiFormRow>
            <EuiFormRow
              label={i18n.translate('helloApp.promptReset', {
                defaultMessage: 'Start over?',
              })}
            >
              <EuiButton data-test-subj="helloWorldResetHandle" onClick={handleReset}>
                <FormattedMessage id="helloApp.resetButton" defaultMessage="Reset" />
              </EuiButton>
            </EuiFormRow>
          </EuiForm>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    </KibanaRenderContextProvider>
  );
};
