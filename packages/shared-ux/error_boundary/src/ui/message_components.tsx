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
  EuiPanel,
} from '@elastic/eui';

import { errorMessageStrings as strings } from './message_strings';

export interface ErrorCalloutProps {
  error: Error;
  errorInfo: Partial<React.ErrorInfo> | null;
  name: string | null;
  onClickRefresh: () => void;
}

const CodePanel: React.FC<ErrorCalloutProps & { onClose: () => void }> = (props) => {
  const { error, errorInfo, name: errorComponentName, onClose } = props;
  const simpleFlyoutTitleId = useGeneratedHtmlId({
    prefix: 'simpleFlyoutTitle',
  });

  const errorName =
    errorComponentName && strings.fatal.callout.details.componentName(errorComponentName);
  const errorTrace = errorInfo?.componentStack ?? error.stack ?? error.toString();

  return (
    <EuiFlyout onClose={onClose} aria-labelledby={simpleFlyoutTitleId} paddingSize="none">
      <EuiFlyoutHeader hasBorder>
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          <EuiTitle size="m">
            <h2>{strings.fatal.callout.details.title()}</h2>
          </EuiTitle>
        </EuiPanel>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock data-test-subj="errorBoundaryFatalDetailsErrorString">
          <p>{(error.stack ?? error.toString()) + '\n\n'}</p>
          <p>
            {errorName}
            {errorTrace}
          </p>
        </EuiCodeBlock>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} flush="left">
                {strings.fatal.callout.details.closeButton()}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={errorName + '\n\n' + errorTrace}>
                {(copy) => (
                  <EuiButton onClick={copy} fill iconType="copyClipboard">
                    {strings.fatal.callout.details.copyToClipboardButton()}
                  </EuiButton>
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

export const FatalPrompt: React.FC<ErrorCalloutProps> = (props) => {
  const { onClickRefresh } = props;
  const [isFlyoutVisible, setIsFlyoutVisible] = useState(false);

  return (
    <EuiEmptyPrompt
      title={<h2 data-test-subj="errorBoundaryFatalHeader">{strings.fatal.callout.title()}</h2>}
      color="danger"
      iconType="error"
      body={
        <>
          <p data-test-subj="errorBoundaryFatalPromptBody">{strings.fatal.callout.body()}</p>
          <p>
            <EuiButton
              color="danger"
              iconType="refresh"
              fill={true}
              onClick={onClickRefresh}
              data-test-subj="errorBoundaryFatalPromptReloadBtn"
            >
              {strings.fatal.callout.pageReloadButton()}
            </EuiButton>
          </p>
          <p>
            <EuiLink
              color="danger"
              onClick={() => setIsFlyoutVisible(true)}
              data-test-subj="errorBoundaryFatalShowDetailsBtn"
            >
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
  const { onClickRefresh } = props;
  return (
    <EuiEmptyPrompt
      title={
        <h2 data-test-subj="errorBoundaryRecoverableHeader">
          {strings.recoverable.callout.title()}
        </h2>
      }
      color="warning"
      iconType="warning"
      body={
        <p data-test-subj="errorBoundaryRecoverablePromptBody">
          {strings.recoverable.callout.body()}
        </p>
      }
      actions={
        <EuiButton
          color="warning"
          iconType="refresh"
          fill={true}
          onClick={onClickRefresh}
          data-test-subj="errorBoundaryRecoverablePromptReloadBtn"
        >
          {strings.recoverable.callout.pageReloadButton()}
        </EuiButton>
      }
    />
  );
};
