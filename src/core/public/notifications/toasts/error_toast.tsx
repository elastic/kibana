/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
import { FormattedMessage } from '@kbn/i18n-react';
import { OverlayStart } from 'kibana/public';
import { I18nStart } from '../../i18n';

interface ErrorToastProps {
  title: string;
  error: Error;
  toastMessage: string;
  openModal: OverlayStart['openModal'];
  i18nContext: () => I18nStart['Context'];
}

interface RequestError extends Error {
  body?: { attributes?: { error: { caused_by: { type: string; reason: string } } } };
}

const isRequestError = (e: Error | RequestError): e is RequestError => {
  if ('body' in e) {
    return e.body?.attributes?.error?.caused_by !== undefined;
  }
  return false;
};

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
  let text = '';

  if (isRequestError(error)) {
    text += `${error?.body?.attributes?.error?.caused_by.type}\n`;
    text += `${error?.body?.attributes?.error?.caused_by.reason}\n\n`;
  }

  if (error.stack) {
    text += error.stack;
  }

  const modal = openModal(
    mount(
      <React.Fragment>
        <I18nContext>
          <EuiModalHeader>
            <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            <EuiCallOut size="s" color="danger" iconType="alert" title={error.message} />
            {text && (
              <React.Fragment>
                <EuiSpacer size="s" />
                <EuiCodeBlock isCopyable={true} paddingSize="s">
                  {text}
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
