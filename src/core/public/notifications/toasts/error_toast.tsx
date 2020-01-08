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
import ReactDOM from 'react-dom';

import {
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { OverlayStart } from '../../overlays';
import { I18nStart } from '../../i18n';

interface ErrorToastProps {
  title: string;
  error: Error;
  toastMessage: string;
  openModal: OverlayStart['openModal'];
  i18nContext: () => I18nStart['Context'];
}

/**
 * This should instead be replaced by the overlay service once it's available.
 * This does not use React portals so that if the parent toast times out, this modal
 * does not disappear. NOTE: this should use a global modal in the overlay service
 * in the future.
 */
function showErrorDialog({
  title,
  error,
  openModal,
  i18nContext,
}: Pick<ErrorToastProps, 'error' | 'title' | 'openModal' | 'i18nContext'>) {
  const I18nContext = i18nContext();
  const modal = openModal(
    mount(
      <React.Fragment>
        <I18nContext>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCallOut size="s" color="danger" iconType="alert" title={error.message} />
            {error.stack && (
              <React.Fragment>
                <EuiSpacer size="s" />
                <EuiCodeBlock isCopyable={true} paddingSize="s">
                  {error.stack}
                </EuiCodeBlock>
              </React.Fragment>
            )}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButton onClick={() => modal.close()} fill>
              <FormattedMessage
                id="core.notifications.errorToast.closeModal"
                defaultMessage="Close"
              />
            </EuiButton>
          </EuiModalFooter>
        </I18nContext>
      </React.Fragment>
    )
  );
}

export function ErrorToast({
  title,
  error,
  toastMessage,
  openModal,
  i18nContext,
}: ErrorToastProps) {
  return (
    <React.Fragment>
      <p data-test-subj="errorToastMessage">{toastMessage}</p>
      <div className="eui-textRight">
        <EuiButton
          size="s"
          color="danger"
          onClick={() => showErrorDialog({ title, error, openModal, i18nContext })}
        >
          <FormattedMessage
            id="core.toasts.errorToast.seeFullError"
            defaultMessage="See the full error"
          />
        </EuiButton>
      </div>
    </React.Fragment>
  );
}

const mount = (component: React.ReactElement) => (container: HTMLElement) => {
  ReactDOM.render(component, container);
  return () => ReactDOM.unmountComponentAtNode(container);
};
