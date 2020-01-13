/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

// @ts-ignore
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiButton,
  EuiText,
  EuiFlyoutFooter,
} from '@elastic/eui';
import { EditorExample } from './editor_example';

interface Props {
  onDismiss: () => void;
}

export function WelcomePanel(props: Props) {
  return (
    <EuiFlyout onClose={props.onDismiss} data-test-subj="welcomePanel" size="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <FormattedMessage
              id="console.welcomePage.pageTitle"
              defaultMessage="Welcome to Console"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText>
          <h4>
            <FormattedMessage
              id="console.welcomePage.quickIntroTitle"
              defaultMessage="Quick intro to the UI"
            />
          </h4>
          <p>
            <FormattedMessage
              id="console.welcomePage.quickIntroDescription"
              defaultMessage="The Console UI is split into two panes: an editor pane (left) and a response pane (right).
                Use the editor to type requests and submit them to Elasticsearch. The results will be displayed in
                the response pane on the right side."
            />
          </p>
          <p>
            <FormattedMessage
              id="console.welcomePage.supportedRequestFormatTitle"
              defaultMessage="Console understands requests in a compact format, similar to cURL:"
            />
          </p>
          <EditorExample panel="welcome" />
          <p>
            <FormattedMessage
              id="console.welcomePage.supportedRequestFormatDescription"
              defaultMessage="While typing a request, Console will make suggestions which you can then accept by hitting Enter/Tab.
              These suggestions are made based on the request structure as well as your indices and types."
            />
          </p>
          <h4>
            <FormattedMessage
              id="console.welcomePage.quickTipsTitle"
              defaultMessage="A few quick tips, while I have your attention"
            />
          </h4>
          <ul>
            <li>
              <FormattedMessage
                id="console.welcomePage.quickTips.submitRequestDescription"
                defaultMessage="Submit requests to ES using the green triangle button."
              />
            </li>
            <li>
              <FormattedMessage
                id="console.welcomePage.quickTips.useWrenchMenuDescription"
                defaultMessage="Use the wrench menu for other useful things."
              />
            </li>
            <li>
              <FormattedMessage
                id="console.welcomePage.quickTips.cUrlFormatForRequestsDescription"
                defaultMessage="You can paste requests in cURL format and they will be translated to the Console syntax."
              />
            </li>
            <li>
              <FormattedMessage
                id="console.welcomePage.quickTips.resizeEditorDescription"
                defaultMessage="You can resize the editor and output panes by dragging the separator between them."
              />
            </li>
            <li>
              <FormattedMessage
                id="console.welcomePage.quickTips.keyboardShortcutsDescription"
                defaultMessage="Study the keyboard shortcuts under the Help button. Good stuff in there!"
              />
            </li>
          </ul>
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
