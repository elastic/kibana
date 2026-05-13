/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { HELLO_WORLD_API_PATH, type HelloWorldResponse } from '../../../../common';

interface HelloWorldAppProps {
  application: ApplicationStart;
  http: HttpStart;
}

export const HelloWorldApp = ({ application, http }: HelloWorldAppProps) => {
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    void http
      .get<HelloWorldResponse>(HELLO_WORLD_API_PATH)
      .then(({ message: nextMessage }) => {
        if (isMounted) {
          setMessage(nextMessage);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError(
            i18n.translate('labs.helloWorld.loadMessageErrorMessage', {
              defaultMessage: 'Unable to load the server message for this lab.',
            })
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [http]);

  return (
    <KibanaPageTemplate
      data-test-subj="labsHelloWorldApp"
      pageHeader={{
        pageTitle: i18n.translate('labs.helloWorld.pageTitle', {
          defaultMessage: 'Hello world',
        }),
        rightSideItems: [
          <EuiButton
            key="backToLabs"
            data-test-subj="labsHelloWorldBackButton"
            onClick={() => application.navigateToApp('labs')}
          >
            {i18n.translate('labs.helloWorld.backToLabsButtonLabel', {
              defaultMessage: 'Back to Labs',
            })}
          </EuiButton>,
        ],
      }}
    >
      <KibanaPageTemplate.Section>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="labs.helloWorld.welcomeTitle"
              defaultMessage="Welcome to the first Labs app"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText>
          <p>
            <FormattedMessage
              id="labs.helloWorld.welcomeDescription"
              defaultMessage="This app proves the Labs marketplace can install a bundled experiment, expose it in Kibana navigation, and lazy load its UI only when needed."
            />
          </p>
        </EuiText>
        <EuiSpacer size="l" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {message ? (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                announceOnMount
                color="success"
                data-test-subj="labsHelloWorldServerMessage"
                title={i18n.translate('labs.helloWorld.serverMessageTitle', {
                  defaultMessage: 'Server response',
                })}
              >
                <p>{message}</p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}
          {error ? (
            <EuiFlexItem grow={false}>
              <EuiCallOut
                announceOnMount
                color="danger"
                data-test-subj="labsHelloWorldServerError"
                title={i18n.translate('labs.helloWorld.serverErrorTitle', {
                  defaultMessage: 'Server request failed',
                })}
              >
                <p>{error}</p>
              </EuiCallOut>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
