/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutFooter,
  EuiLink,
  EuiTitle,
  useGeneratedHtmlId,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiCopy,
} from '@elastic/eui';

import { errorMessageStrings as strings } from './message_strings';

export interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  reloadWindow: () => void;
}

const CodePanel: React.FC<ErrorCalloutProps & { onClose: () => void }> = (props) => {
  const { error, errorInfo, name: errorComponentName, onClose } = props;
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const errorMessage = errorComponentName
    ? strings.fatal.callout.details.componentName(errorComponentName)
    : error.message;
  const errorTrace = errorInfo?.componentStack ?? error.stack ?? error.toString();

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={simpleFlyoutTitleId} paddingSize="s">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{strings.fatal.callout.details.title()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock>
          <p>{errorMessage}</p>
          <p>{errorTrace}</p>
        </EuiCodeBlock>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} flush="left">
              {strings.fatal.callout.details.closeButton()}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiCopy textToCopy={errorMessage + '\n\n' + errorTrace}>
              {(copy) => (
                <EuiButton onClick={copy} fill iconType="copyClipboard">
                  {strings.fatal.callout.details.copyToClipboardButton()}
                </EuiButton>
              )}
            </EuiCopy>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const FatalPrompt: React.FC<ErrorCalloutProps> = (props) => {
  const { reloadWindow } = props;
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  return (
    <EuiEmptyPrompt
      title={<h2>{strings.fatal.callout.title()}</h2>}
      color="danger"
      iconType="error"
      body={
        <>
          <p>{strings.fatal.callout.body()}</p>
          <p>
            <EuiButton
              color="danger"
              iconType="refresh"
              fill={true}
              onClick={reloadWindow}
              data-test-subj="fatalPromptReloadBtn"
            >
              {strings.fatal.callout.pageReloadButton()}
            </EuiButton>
          </p>
          <p>
            <EuiLink color="danger" onClick={() => setIsFlyoutVisible(true)}>
              {strings.fatal.callout.showDetailsButton()}
            </EuiLink>
            {isFlyoutVisible ? (
              <CodePanel {...props} onClose={() => setIsFlyoutVisible(false)} />
            ) : null}
          </p>
        </>
      }
    />
  );
};

export const RecoverablePrompt = (props: ErrorCalloutProps) => {
  const { reloadWindow } = props;
  return (
    <EuiEmptyPrompt
      iconType="warning"
      title={<h2>{strings.recoverable.callout.title()}</h2>}
      body={<p>{strings.recoverable.callout.body()}</p>}
      color="warning"
      actions={
        <EuiButton
          color="warning"
          iconType="refresh"
          fill={true}
          onClick={reloadWindow}
          data-test-subj="recoverablePromptReloadBtn"
        >
          {strings.recoverable.callout.pageReloadButton()}
        </EuiButton>
      }
    />
  );
};
