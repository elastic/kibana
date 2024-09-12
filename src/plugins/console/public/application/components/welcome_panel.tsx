/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiFlyoutFooter,
  EuiCode,
} from '@elastic/eui';
import EditorExample from './editor_example';
import * as examples from '../../../common/constants/welcome_panel';

interface Props {
  onDismiss: () => void;
}

export function WelcomePanel(props: Props) {
  return (
    <EuiFlyout
      onClose={props.onDismiss}
      data-test-subj="welcomePanel"
      size="m"
      maxWidth={0}
      ownFocus={false}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="console.welcomePage.pageTitle"
              defaultMessage="Send requests with Console"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="console.welcomePage.quickIntroDescription"
              defaultMessage="Console understands commands in a cURL-like syntax. Here is a request to the Elasticsearch _search API."
            />
          </p>
          <EditorExample panel="welcome-example-1" />
          <p>
            <FormattedMessage
              id="console.welcomePage.kibanaAPIsDescription"
              defaultMessage="To send a request to a Kibana API, prefix the path with {kibanaApiPrefix}."
              values={{
                kibanaApiPrefix: <EuiCode>kbn:</EuiCode>,
              }}
            />
          </p>
          <EditorExample
            panel="welcome-example-2"
            example={examples.kibanaApiExample}
            linesOfExampleCode={2}
          />
          <h4>
            <FormattedMessage
              id="console.welcomePage.sendMultipleRequestsTitle"
              defaultMessage="Send multiple requests"
            />
          </h4>
          <p>
            <FormattedMessage
              id="console.welcomePage.sendMultipleRequestsDescription"
              defaultMessage="Select multiple requests and send them together. You'll get responses to all your requests, regardless of whether they succeed or fail."
            />
          </p>
          <EditorExample
            panel="welcome-example-3"
            example={examples.multipleRequestsExample}
            linesOfExampleCode={22}
            mode="output"
          />

          <h4>
            <FormattedMessage
              id="console.welcomePage.addCommentsTitle"
              defaultMessage="Add comments in request bodies"
            />
          </h4>
          <p>
            <FormattedMessage
              id="console.welcomePage.addCommentsDescription"
              defaultMessage="To add a single-line comment, use {hash} or {doubleSlash}. For a multiline comment, mark the beginning with {slashAsterisk} and the end with {asteriskSlash}."
              values={{
                hash: <EuiCode>#</EuiCode>,
                doubleSlash: <EuiCode>//</EuiCode>,
                slashAsterisk: <EuiCode>/*</EuiCode>,
                asteriskSlash: <EuiCode>*/</EuiCode>,
              }}
            />
          </p>
          <EditorExample
            panel="welcome-example-4"
            example={examples.commentsExample}
            linesOfExampleCode={14}
          />
          <h4>
            <FormattedMessage
              id="console.welcomePage.useVariablesTitle"
              defaultMessage="Reuse values with variables"
            />
          </h4>
          <p>
            <FormattedMessage
              id="console.welcomePage.useVariablesDescription"
              defaultMessage="Define variables in Console, and then use them in your requests in the form of {variableName}."
              values={{
                // use html tags to render the curly braces
                variableName: <EuiCode>$&#123;variableName&#125;</EuiCode>,
              }}
            />
          </p>

          <ol>
            <li>
              <FormattedMessage
                id="console.welcomePage.useVariables.step1"
                defaultMessage="Click {variableText}, and then enter the variable name and value."
                values={{
                  variableText: <strong>Variables</strong>,
                }}
              />
            </li>
            <li>
              <FormattedMessage
                id="console.welcomePage.useVariables.step2"
                defaultMessage="Refer to variables in the paths and bodies of your requests as many times as you like."
              />
            </li>
          </ol>
          <EditorExample
            panel="welcome-example-5"
            example={examples.variablesExample}
            linesOfExampleCode={9}
          />
        </EuiText>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButton
          fill={true}
          fullWidth={false}
          data-test-subj="help-close-button"
          onClick={props.onDismiss}
        >
          <FormattedMessage id="console.welcomePage.closeButtonLabel" defaultMessage="Dismiss" />
        </EuiButton>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
