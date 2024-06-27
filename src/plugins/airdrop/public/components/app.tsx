/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage, I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import {
  EuiHorizontalRule,
  EuiPageTemplate,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { DragWrapper, useOnDrop } from '@kbn/airdrops';

import { Form, FormState } from './form';

interface AirdropAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
}

const DROP_ID = 'form';

export const AirdropApp = ({ basename, notifications, http }: AirdropAppDeps) => {
  const [formState, setFormState] = useState<FormState>({
    firstName: '',
    lastName: '',
    acceptTerms: false,
  });

  const airdropForm = useOnDrop<FormState>({ id: DROP_ID });

  useEffect(() => {
    if (airdropForm) {
      setFormState(airdropForm.content);
    }
  }, [airdropForm]);

  // const onClickHandler = () => {
  //   // Use the core http service to make a response to the server API.
  //   http.get('/api/airdrop/example').then((res) => {
  //     setTimestamp(res.time);
  //     // Use the core notifications service to display a success message.
  //     notifications.toasts.addSuccess(
  //       i18n.translate('airdrop.dataUpdated', {
  //         defaultMessage: 'Data updated',
  //       })
  //     );
  //   });
  // };

  return (
    <Router basename={basename}>
      <I18nProvider>
        <EuiPageTemplate
          restrictWidth="1000px"
          css={{ minBlockSize: 'max(460px,100vh - 108px) !important' }}
        >
          <EuiPageTemplate.Header>
            <EuiTitle size="l">
              <h1>Airdrop</h1>
            </EuiTitle>
          </EuiPageTemplate.Header>
          <EuiPageTemplate.Section>
            <EuiFlexGroup justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiTitle>
                  <h2>My form</h2>
                </EuiTitle>
                <EuiText>
                  <p>
                    <FormattedMessage
                      id="airdrop.content"
                      defaultMessage="Some cool form to fill out"
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <DragWrapper
                  data={{
                    id: DROP_ID,
                    get: () => formState,
                  }}
                >
                  <EuiButtonIcon
                    display="base"
                    iconSize="m"
                    size="m"
                    iconType="watchesApp"
                    aria-label="Next"
                  />
                </DragWrapper>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiHorizontalRule />

            <EuiSpacer />

            <Form
              form={formState}
              onChange={setFormState}
              onSubmit={() => {
                console.log('submit', formState);
              }}
            />

            {/* <EuiCodeBlock language="json" paddingSize="s" isCopyable>
                    {JSON.stringify(formState, null, 2)}
                  </EuiCodeBlock> */}

            <EuiSpacer />
          </EuiPageTemplate.Section>
        </EuiPageTemplate>
      </I18nProvider>
    </Router>
  );
};
