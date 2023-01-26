/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

// @ts-ignore
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
    <EuiFlyout onClose={props.onDismiss} data-test-subj="welcomePanel" size="m" ownFocus={false}>
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
          <EditorExample panel="welcome" />
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
            panel="welcome"
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
            panel="welcome"
            example={examples.multipleRequestsExample}
            linesOfExampleCode={19}
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
              defaultMessage="To add a single-line comment, use {hash} or {doubleSlash}. For a multiline comment, mark the beginninf with {slashAsterisk} and the end with {asteriskSlash}."
              values={{
                hash: <EuiCode>#</EuiCode>,
                doubleSlash: <EuiCode>//</EuiCode>,
                slashAsterisk: <EuiCode>/*</EuiCode>,
                asteriskSlash: <EuiCode>*/</EuiCode>,
              }}
            />
          </p>
          <EditorExample
            panel="welcome"
            example={examples.commentsExample}
            linesOfExampleCode={11}
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
                defaultMessage="Click Variable, and then enter the variable name and value."
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
            panel="welcome"
            example={examples.variablesExample}
            linesOfExampleCode={8}
          />

          <h4>
            <FormattedMessage
              id="console.welcomePage.keyboardShortcutsTitle"
              defaultMessage="Keyboard shortcuts"
            />
          </h4>
          <p>
            <FormattedMessage
              id="console.welcomePage.keyboardShortcutsDescription"
              defaultMessage="For a list of keyboard shortcuts, click Help."
            />
          </p>

          {/* Animated gif here */}
          <img
            src={examples.keyboardShortcutsImageUrl}
            alt="Keyboard shortcut for auto-indenting a command"
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
